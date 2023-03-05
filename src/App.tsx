import { useEffect, useState } from "react";
import { SafeEventEmitterProvider, UserInfo } from "@web3auth/base";
import "./App.css";
import { ethers } from "ethers";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { Tasks } from "./components/Tasks";
import { addTask } from "./store/slices/taskSlice";
import { addError } from "./store/slices/errorSlice";
import { ErrorMessage } from "./components/ErrorMessage";
import { SmartWallet } from "./components/SmartWallet";
import { Eoa } from "./components/Eoa";
import { Counter } from "./components/Counter";
import { COUNTER_CONTRACT_ABI } from "./constants";
import { Loading } from "./components/Loading";
import { getChainConfig } from "./utils";
import {
  GaslessOnboarding,
  GaslessWalletConfig,
  GaslessWalletInterface,
  LoginConfig,
} from "@gelatonetwork/gasless-onboarding";
import { Dropdown } from "./components/Dropdown";

function App() {
  // Global State
  const tasks = useAppSelector((state) => state.tasks.tasks);
  const error = useAppSelector((state) => state.error.message);
  const dispatch = useAppDispatch();

  const [contractConfig, setContractConfig] = useState<{
    chainId: number;
    target: string;
  }>();
  const [currentChain, setCurrentChain] = useState<{
    id: number;
    name: string;
  }>();
  const [gelatoLogin, setGelatoLogin] = useState<
    GaslessOnboarding | undefined
  >();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [counter, setCounter] = useState<string>("0");
  const [web3AuthProvider, setWeb3AuthProvider] =
    useState<SafeEventEmitterProvider | null>(null);
  const [smartWallet, setSmartWallet] = useState<GaslessWalletInterface | null>(
    null
  );
  const [counterContract, setCounterContract] =
    useState<ethers.Contract | null>(null);
  const [user, setUser] = useState<Partial<UserInfo> | null>(null);
  const [wallet, setWallet] = useState<{
    address: string;
    balance: string;
    chainId: number;
  } | null>(null);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);

  const increment = async () => {
    if (!counterContract) {
      return dispatch(addError("Counter Contract is not initiated"));
    }
    let { data } = await counterContract.populateTransaction.increment();
    if (!data) {
      return dispatch(
        addError("Counter Contract Transaction Data could not get populated")
      );
    }
    if (!smartWallet) {
      return dispatch(addError("Smart Wallet is not initiated"));
    }
    try {
      const { taskId } = await smartWallet.sponsorTransaction(
        contractConfig?.target!,
        data
      );
      dispatch(addTask(taskId));
    } catch (error) {
      dispatch(addError((error as Error).message));
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const chainIdParam = queryParams.get("chainId");
        const { apiKey, chainId, target, name } =
          getChainConfig(chainIdParam);
        setCurrentChain({ name, id: chainId });
        const smartWalletConfig: GaslessWalletConfig = { apiKey };
        const loginConfig: LoginConfig = {
          domains: [window.location.origin],
          chain: {
            id: 84531,
            rpcUrl: 'https://goerli.base.org/',
          },
          ui: {
            theme: "dark",
          },
          openLogin: {
            redirectUrl: `${window.location.origin}/?chainId=${chainId}`,
          },
        };
        const gelatoLogin = new GaslessOnboarding(
          loginConfig,
          smartWalletConfig
        );
        setContractConfig({ chainId, target });
        await gelatoLogin.init();
        setGelatoLogin(gelatoLogin);
        const provider = gelatoLogin.getProvider();
        if (provider) {
          setWeb3AuthProvider(provider);
        }
      } catch (error) {
        dispatch(addError((error as Error).message));
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [dispatch]);

  useEffect(() => {
    const init = async () => {
      if (!gelatoLogin || !web3AuthProvider) {
        return;
      }
      setIsLoading(true);
      const web3Provider = new ethers.providers.Web3Provider(web3AuthProvider!);
      const signer = web3Provider.getSigner();
      setWallet({
        address: await signer.getAddress(),
        balance: (await signer.getBalance()).toString(),
        chainId: await signer.getChainId(),
      });
      const user = await gelatoLogin.getUserInfo();
      setUser(user);
      const gelatoSmartWallet = gelatoLogin.getGaslessWallet();
      setSmartWallet(gelatoSmartWallet);
      setIsDeployed(await gelatoSmartWallet.isDeployed());
      const counterContract = new ethers.Contract(
        contractConfig?.target!,
        COUNTER_CONTRACT_ABI,
        new ethers.providers.Web3Provider(web3AuthProvider!).getSigner()
      );
      setCounterContract(counterContract);
      const fetchStatus = async () => {
        if (!counterContract || !gelatoSmartWallet) {
          return;
        }
        const counter = (await counterContract.counter()).toString();
        setCounter(counter);
        setIsDeployed(await gelatoSmartWallet.isDeployed());
      };
      await fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      setIsLoading(false);
      return () => clearInterval(interval);
    };
    init();
  }, [contractConfig?.target, gelatoLogin, web3AuthProvider]);

  const login = async () => {
    if (!gelatoLogin) {
      return;
    }
    const web3authProvider = await gelatoLogin.login();
    setWeb3AuthProvider(web3authProvider);
  };

  const logout = async () => {
    if (!gelatoLogin) {
      return;
    }
    await gelatoLogin.logout();
    setWeb3AuthProvider(null);
    setWallet(null);
    setUser(null);
    setSmartWallet(null);
    setCounterContract(null);
  };

  const loggedInView = isLoading ? (
    <Loading />
  ) : (
    <div className="flex flex-col h-full w-[700px] gap-2 py-10">
      <Eoa user={user} wallet={wallet} />
      {smartWallet?.isInitiated() && (
        <div className="flex justify-center flex-col gap-10">
          <SmartWallet
            address={smartWallet.getAddress()!}
            isDeployed={isDeployed}
            chainId={contractConfig?.chainId!}
          />
          <Counter
            address={contractConfig?.target!}
            chainId={contractConfig?.chainId!}
            counter={counter}
            handleClick={increment}
            key={counter}
          />
        </div>
      )}
      {tasks.length > 0 && (
        <div className="flex flex-col pb-14">
          <div className="mt-10 h-[0.1rem] bg-[#b45f63] opacity-20" />
          <Tasks />
        </div>
      )}
    </div>
  );

  const toLoginInView = (
    <div className="flex justify-center flex-col items-center h-full w-full gap-10">
      <p className="text-6xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#b45f63] to-[#f5c3a6]">
        Number Increment in Gasless Transactions on Base by Coinbase
      </p>

      <div className="h-12">
          <button
            onClick={login}
            className="px-4 border-2 border-[#b45f63] rounded-lg"
          >
            <p className="px-4 py-1 font-semibold text-gray-800 text-lg">
              Login
            </p>
          </button>
      </div>
    </div>
  );

  return (
    <>
      {error && <ErrorMessage />}
      {web3AuthProvider && (
        <div className="flex justify-between p-5 gap-5 items-center">
          <Dropdown chain={currentChain?.name!} />
          <button
            onClick={logout}
            className="px-4 py-1 border-2 border-[#b45f63] rounded-lg"
          >
            <p className="font-semibold text-gray-800 text-lg">Logout</p>
          </button>
        </div>
      )}
      <div className="flex h-screen px-20 justify-center">
        {web3AuthProvider ? loggedInView : toLoginInView}
      </div>
    </>
  );
}

export default App;
