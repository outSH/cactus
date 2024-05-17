import * as React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import PageTitle from "../../../../components/ui/PageTitle";
import { Typography } from "@mui/material";

export default function AccountTokenList() {
  const [value, setValue] = React.useState("1");

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <Box>
      <PageTitle>Tokens</PageTitle>
      <Box sx={{ width: "100%", typography: "body1" }}>
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={handleChange}
              aria-label="lab API tabs example"
              textColor="secondary"
              indicatorColor="primary"
            >
              <Tab label="ERC20" value="1" />
              <Tab label="ERC721" value="2" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <Typography variant="h5" color="secondary">
              ERC20
            </Typography>
            <p>Some content...</p>
          </TabPanel>
          <TabPanel value="2">
            <Typography variant="h5" color="secondary">
              ERC721
            </Typography>
            <p>Some content...</p>
          </TabPanel>
        </TabContext>
      </Box>
    </Box>
  );
}
