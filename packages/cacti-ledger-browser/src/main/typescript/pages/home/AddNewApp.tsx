import * as React from "react";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import WebIcon from "@mui/icons-material/Web";
import DnsIcon from "@mui/icons-material/Dns";
import TokenIcon from "@mui/icons-material/Token";
import ListItemButton from "@mui/material/ListItemButton";
import TextField from "@mui/material/TextField";

const steps = ["Select Group", "Select App", "Common Setup"];

function AppSetupStepperNavigation({
  activeStep,
  handleBack,
  handleNext,
}: any) {
  return (
    <Box sx={{ display: "flex", flexDirection: "row", paddingTop: 2 }}>
      <Button
        color="inherit"
        disabled={activeStep === 0}
        onClick={handleBack}
        sx={{ mr: 1 }}
      >
        Back
      </Button>
      <Box sx={{ flex: "1 1 auto" }} />
      <Button onClick={handleNext}>
        {activeStep === steps.length - 1 ? "Finish" : "Next"}
      </Button>
    </Box>
  );
}

function CommonAppSetupView({ activeStep, handleBack, handleNext }: any) {
  const [formValues, setFormValues] = React.useState({
    instanceName: "My Eth",
    description: "Foo",
    path: "/eth",
  });

  const handleChange = (e) => {
    setFormValues({
      ...formValues,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log(formValues);
  };

  // https://mui.com/material-ui/react-text-field/
  return (
    <>
      <Typography variant="h4">Common App Setup</Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxWidth: 500,
          padding: 1,
          marginTop: 2,
        }}
      >
        <TextField
          label="Instance Name"
          name="name"
          value={formValues.instanceName}
          onChange={handleChange}
        />
        <TextField
          label="Description"
          name="description"
          maxRows={4}
          value={formValues.description}
          onChange={handleChange}
        />
        <TextField
          label="Path"
          name="path"
          helperText="Path under which the plugin will be available, must be unique withing GUI."
          value={formValues.path}
          onChange={handleChange}
        />
      </Box>
      <AppSetupStepperNavigation
        activeStep={activeStep}
        handleBack={handleBack}
        handleNext={handleNext}
      />
    </>
  );
}

function AppSelectView({ activeStep, handleBack, handleNext }: any) {
  return (
    <>
      <Typography variant="h4">Select Application</Typography>
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        <ListItemButton>
          <ListItemAvatar>
            <Avatar>
              <WebIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Ethereum Browser"
            secondary="Applicaion for browsing Ethereum ledger blocks, transactions and tokens. Requires Ethereum persistence plugin to work correctly."
          />
        </ListItemButton>
        <ListItemButton>
          <ListItemAvatar>
            <Avatar>
              <WebIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Hyperledger Fabric Browser"
            secondary="Applicaion for browsing Hyperledger Fabric ledger blocks and transactions. Requires Fabric persistence plugin to work correctly."
          />
        </ListItemButton>
      </List>
      <AppSetupStepperNavigation
        activeStep={activeStep}
        handleBack={handleBack}
        handleNext={handleNext}
      />
    </>
  );
}

function GroupSelectView({ activeStep, handleBack, handleNext }: any) {
  return (
    <>
      <Typography variant="h4">Select Group</Typography>
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        <ListItemButton>
          <ListItemAvatar>
            <Avatar>
              <WebIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Ledger Browser (2)"
            secondary="Browse and analyse ledger data persisted in a database"
          />
        </ListItemButton>
        <ListItemButton disabled>
          <ListItemAvatar>
            <Avatar>
              <DnsIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Connectors (0)"
            secondary="Interact with ledgers through Cacti connectors"
          />
        </ListItemButton>
        <ListItemButton disabled>
          <ListItemAvatar>
            <Avatar>
              <TokenIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Sample Apps (0)"
            secondary="Run sample Cacti application"
          />
        </ListItemButton>
      </List>
      <AppSetupStepperNavigation
        activeStep={activeStep}
        handleBack={handleBack}
        handleNext={handleNext}
      />
    </>
  );
}

function getCurrentComponent(
  activeStep: number,
  handleBack: any,
  handleNext: any,
) {
  switch (activeStep) {
    case 0:
      return (
        <GroupSelectView
          activeStep={activeStep}
          handleBack={handleBack}
          handleNext={handleNext}
        />
      );
    case 1:
      return (
        <AppSelectView
          activeStep={activeStep}
          handleBack={handleBack}
          handleNext={handleNext}
        />
      );
    case 2:
      return (
        <CommonAppSetupView
          activeStep={activeStep}
          handleBack={handleBack}
          handleNext={handleNext}
        />
      );
  }
}

export default function AddNewApp() {
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => {
          return (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <Box sx={{ paddingTop: 3 }}>
        {getCurrentComponent(activeStep, handleBack, handleNext)}
      </Box>
    </Box>
  );
}
