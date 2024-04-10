import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import { Link } from "react-router-dom";

const appList = [
  {
    path: "/",
    name: "Home",
  },
  {
    path: "/eth",
    name: "Ethereum",
  },
  {
    path: "/fabric",
    name: "Fabric",
  },
];

function HeaderBar({ menuEntries }: any) {
  const [anchorElAppMenu, setAnchorElAppMenu] =
    React.useState<null | HTMLElement>(null);

  const handleOpenAppMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElAppMenu(event.currentTarget);
  };

  const handleCloseAppMenu = () => {
    setAnchorElAppMenu(null);
  };

  return (
    <AppBar position="static" sx={{ paddingX: 2 }}>
      <Toolbar disableGutters>
        <Tooltip title="Select App">
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="select-application-button"
            sx={{ mr: 2 }}
            onClick={handleOpenAppMenu}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
        <Menu
          sx={{ mt: "45px" }}
          id="app-select-bar"
          anchorEl={anchorElAppMenu}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorElAppMenu)}
          onClose={handleCloseAppMenu}
        >
          {appList.map((app) => (
            <MenuItem key={app.name} onClick={handleCloseAppMenu}>
              <Link to={app.path}>{app.name}</Link>
            </MenuItem>
          ))}
        </Menu>

        {menuEntries && (
          <Box sx={{ flexGrow: 1, display: "flex" }}>
            {menuEntries.map((entry: any) => (
              <Button
                key={entry.title}
                sx={{ my: 2, color: "white", display: "block" }}
              >
                <Link to={entry.url}>{entry.title}</Link>
              </Button>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
export default HeaderBar;
