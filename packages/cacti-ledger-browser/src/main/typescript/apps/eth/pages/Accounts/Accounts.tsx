import * as React from "react";
import Paper from "@mui/material/Paper";
import InputBase from "@mui/material/InputBase";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import DirectionsIcon from "@mui/icons-material/Directions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import AccountTokenList from "./AccountTokenList";
import { ethers } from "ethers";
// import { isAddress } from "web3-validator";

export default function CustomizedInputBase() {
  const [accountSearchText, setAccountSearchText] = React.useState("");
  const [errorText, setErrorText] = React.useState("");
  const [accountShow, setAccountShow] = React.useState(false);

  const handleSearchClick = () => {
    if (!ethers.isAddress(accountSearchText.toLowerCase())) {
      return setErrorText(
        "Address format not recognized, use hexadecimal string",
      );
    }

    setAccountShow(true);
  };

  return (
    <>
      {/* Search Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ padding: 2 }}>
          <TextField
            label="Account address"
            sx={{ width: 600 }}
            variant={accountShow ? "filled" : "standard"}
            value={accountSearchText}
            onChange={(e) => {
              setErrorText("");
              setAccountSearchText(e.target.value.trim());
            }}
            error={Boolean(errorText)}
            helperText={errorText}
          />
        </Box>
        <Button
          variant="contained"
          size="large"
          endIcon={<SearchIcon />}
          onClick={handleSearchClick}
        >
          Search
        </Button>
      </Box>

      {/* Token Details */}
      {accountShow && <AccountTokenList account={"bla"} />}
    </>
  );
}
