import { Outlet } from "react-router-dom";
import TokenDetails from "./pages/Details/TokenDetails";
import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import OldAccounts from "./pages/OldAccounts/OldAccounts";
import TransactionDetails from "./pages/Details/TransactionDetails";
import ERC20 from "./pages/ERC20/ERC20";
import SingleTokenHistory from "./pages/SingleTokenHistory/SingleTokenHistory";
import ERC721 from "./pages/ERC721/ERC721";
import BlockDetails from "./pages/Details/BlockDetails";
import { AppConfig } from "../../common/types/app";

const ethConfig: AppConfig = {
  name: "Ethereum",
  path: "/eth",
  menuEntries: [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "ERC20",
      url: "/old-accounts/erc20",
    },
    {
      title: "ERC721 (NFT)",
      url: "/old-accounts/erc721",
    },
  ],
  routes: [
    {
      element: <Dashboard />,
    },
    {
      path: "blocks",
      element: <Blocks />,
    },
    {
      path: "transactions",
      element: <Transactions />,
    },
    {
      path: "old-accounts",
      element: <Outlet />,
      children: [
        {
          path: ":standard",
          element: <OldAccounts />,
        },
      ],
    },
    {
      path: "token-details",
      element: <Outlet />,
      children: [
        {
          path: ":standard/:address",
          element: (
            <div>
              <TokenDetails></TokenDetails>
            </div>
          ),
        },
      ],
    },
    {
      path: "erc20",
      element: <Outlet />,
      children: [
        {
          path: ":account",
          element: <ERC20 />,
        },
        {
          path: "trend/:account/:address",
          element: <SingleTokenHistory />,
        },
      ],
    },
    {
      path: "erc721",
      element: <Outlet />,
      children: [
        {
          path: ":account",
          element: <ERC721 />,
        },
      ],
    },
  ],
};

export default ethConfig;
