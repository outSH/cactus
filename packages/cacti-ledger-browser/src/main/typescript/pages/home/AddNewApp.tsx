import * as React from "react";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import WebIcon from "@mui/icons-material/Web";
import DnsIcon from "@mui/icons-material/Dns";
import TokenIcon from "@mui/icons-material/Token";
import ListItemButton from "@mui/material/ListItemButton";
import TextField from "@mui/material/TextField";
import config from "../../common/config";
import { AppCategory, getAppCategoryConfig } from "../../common/app-category";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addGuiAppConfig, invalidateGuiAppConfig } from "../../common/queries";
import { useNotification } from "../../common/context/NotificationContext";

const steps = [
  "Select Group",
  "Select App",
  "Common Setup",
  "App Specific Setup",
];

function AppSpecificSetupView({
  appOptionsJsonString,
  setAppOptionsJsonString,
  handleBack,
  handleNext,
  isSending,
}: any) {
  const [validationError, setValidationError] = React.useState("");
  const handleChange = (e: any) => {
    setValidationError("");
    setAppOptionsJsonString(e.target.value);
  };

  return (
    <>
      <Typography variant="h4">App Specific Setup</Typography>
      <Box
        component="form"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: 1,
          marginTop: 2,
        }}
      >
        <TextField
          label="Application Options JSON"
          name="options"
          multiline
          maxRows={30}
          error={!!validationError}
          helperText={validationError}
          value={appOptionsJsonString}
          onChange={handleChange}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "row", paddingTop: 2 }}>
        <Button color="inherit" onClick={handleBack} sx={{ mr: 1 }}>
          Back
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />
        <LoadingButton
          size="large"
          loading={isSending}
          loadingPosition="start"
          startIcon={<SaveIcon />}
          variant="contained"
          onClick={() => {
            // Validate JSON input
            try {
              JSON.parse(appOptionsJsonString);
            } catch (error) {
              setValidationError(`Invalid JSON format, error: ${error}`);
              return;
            }

            handleNext();
          }}
        >
          Save
        </LoadingButton>
      </Box>
    </>
  );
}

function CommonAppSetupView({
  commonSetupValues,
  setCommonSetupValues,
  handleBack,
  handleNext,
}: any) {
  const emptyFormHelperText = "Field can't be empty";
  const isInstanceNameEmptyError = !!!commonSetupValues.instanceName;
  const isDescriptionEmptyError = !!!commonSetupValues.description;
  const isPathEmptyError = !!!commonSetupValues.path;
  const isPathInvalidError = !(
    commonSetupValues.path.startsWith("/") && commonSetupValues.path.length > 1
  );
  let pathHelperText =
    "Path under which the plugin will be available, must be unique withing GUI.";
  if (isPathEmptyError) {
    pathHelperText = emptyFormHelperText;
  } else if (isPathInvalidError) {
    pathHelperText = "Must be valid path (starting with '/')";
  }

  const handleChange = (e: any) => {
    setCommonSetupValues({
      ...commonSetupValues,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <Typography variant="h4">Common App Setup</Typography>
      <Box
        component="form"
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
          name="instanceName"
          error={isInstanceNameEmptyError}
          helperText={isInstanceNameEmptyError ? emptyFormHelperText : ""}
          value={commonSetupValues.instanceName}
          onChange={handleChange}
        />
        <TextField
          label="Description"
          name="description"
          error={isDescriptionEmptyError}
          helperText={isDescriptionEmptyError ? emptyFormHelperText : ""}
          multiline
          maxRows={4}
          value={commonSetupValues.description}
          onChange={handleChange}
        />
        <TextField
          label="Path"
          name="path"
          error={isPathEmptyError || isPathInvalidError}
          helperText={pathHelperText}
          value={commonSetupValues.path}
          onChange={handleChange}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "row", paddingTop: 2 }}>
        <Button color="inherit" onClick={handleBack} sx={{ mr: 1 }}>
          Back
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />
        <Button onClick={handleNext}>Next</Button>
      </Box>
    </>
  );
}

function AppSelectView({ appCategory, handleAppSelected, handleBack }: any) {
  const apps = Array.from(config).filter(
    (app) => app[1].category === appCategory,
  );
  const categoryConfig = getAppCategoryConfig(appCategory);

  return (
    <>
      <Typography variant="h4">Select Application</Typography>
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {apps.map((app) => {
          return (
            <ListItemButton onClick={() => handleAppSelected(app[0])}>
              <ListItemAvatar>
                <Avatar>{categoryConfig.icon}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={app[1].appName}
                secondary={app[1].defaultDescription}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ display: "flex", flexDirection: "row", paddingTop: 2 }}>
        <Button color="inherit" onClick={handleBack} sx={{ mr: 1 }}>
          Back
        </Button>
      </Box>
    </>
  );
}

function GroupSelectView({ handleCategorySelected }: any) {
  const appCategories = Array.from(config.values()).map((app) => app.category);

  return (
    <>
      <Typography variant="h4">Select Group</Typography>
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {Object.values(AppCategory).map((category) => {
          const categoryConfig = getAppCategoryConfig(category);
          const appCount = appCategories.filter(
            (appCat) => appCat === category,
          ).length;
          const categoryTitle = `${categoryConfig.name} (${appCount})`;
          return (
            <ListItemButton
              disabled={appCount === 0}
              onClick={() => handleCategorySelected(category)}
            >
              <ListItemAvatar>
                <Avatar>{categoryConfig.icon}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={categoryTitle}
                secondary={categoryConfig.description}
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}

export default function AddNewApp({ handleDone }: any) {
  const { showNotification } = useNotification();
  const [activeStep, setActiveStep] = React.useState(0);
  const [appCategory, setAppCategory] = React.useState<AppCategory | "">("");
  const [appId, setAppId] = React.useState("");
  const [commonSetupValues, setCommonSetupValues] = React.useState({
    instanceName: "",
    description: "",
    path: "",
  });
  const [appOptionsJsonString, setAppOptionsJsonString] = React.useState("");
  const queryClient = useQueryClient();
  const addGuiAppMutation = useMutation({
    mutationFn: addGuiAppConfig,
    onSuccess: () => invalidateGuiAppConfig(queryClient),
  });

  React.useEffect(() => {
    if (addGuiAppMutation.isError) {
      showNotification(
        `Could not fetch action endorsements: ${addGuiAppMutation.error}`,
        "error",
      );
      addGuiAppMutation.reset();
    }
  }, [addGuiAppMutation.isError]);

  React.useEffect(() => {
    if (addGuiAppMutation.isSuccess) {
      showNotification(
        `Application ${commonSetupValues.instanceName} added successfully`,
        "success",
      );
      addGuiAppMutation.reset();
      handleDone();
    }
  }, [addGuiAppMutation.isSuccess]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  let currentPage: JSX.Element | undefined;
  switch (activeStep) {
    case 0:
      currentPage = (
        <GroupSelectView
          handleCategorySelected={(category) => {
            setAppCategory(category);
            handleNext();
          }}
        />
      );
      break;
    case 1:
      currentPage = (
        <AppSelectView
          appCategory={appCategory}
          handleAppSelected={(appId) => {
            setAppId(appId);
            const appDefinition = config.get(appId);
            if (!appDefinition) {
              throw new Error(`Could not find App Definition with id ${appId}`);
            }
            setCommonSetupValues({
              instanceName: appDefinition.defaultInstanceName,
              description: appDefinition.defaultDescription,
              path: appDefinition.defaultPath,
            });
            setAppOptionsJsonString(
              JSON.stringify(appDefinition.defaultOptions, undefined, 2),
            );
            handleNext();
          }}
          handleBack={() => {
            setAppCategory("");
            handleBack();
          }}
        />
      );
      break;
    case 2:
      currentPage = (
        <CommonAppSetupView
          appId={appId}
          commonSetupValues={commonSetupValues}
          setCommonSetupValues={setCommonSetupValues}
          handleBack={handleBack}
          handleNext={handleNext}
        />
      );
      break;
    case 3:
      currentPage = (
        <AppSpecificSetupView
          appOptionsJsonString={appOptionsJsonString}
          setAppOptionsJsonString={setAppOptionsJsonString}
          activeStep={activeStep}
          handleBack={handleBack}
          isSending={addGuiAppMutation.isPending}
          handleNext={() => {
            addGuiAppMutation.mutate({
              app_id: appId,
              instance_name: commonSetupValues.instanceName,
              description: commonSetupValues.description,
              path: commonSetupValues.path,
              options: JSON.parse(appOptionsJsonString),
            });
          }}
        />
      );
      break;
  }

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
      <Box sx={{ paddingTop: 3 }}>{currentPage}</Box>
    </Box>
  );
}
