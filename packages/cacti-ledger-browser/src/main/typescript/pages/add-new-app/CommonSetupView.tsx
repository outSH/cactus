import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

const emptyFormHelperText = "Field can't be empty";
const regularPathHelperText =
  "Path under which the plugin will be available, must be unique withing GUI.";
const illformedPathHelperText = "Must be valid path (starting with '/')";

export interface CommonSetupFormValues {
  instanceName: string;
  description: string;
  path: string;
}

export interface CommonSetupViewProps {
  commonSetupValues: CommonSetupFormValues;
  setCommonSetupValues: React.Dispatch<
    React.SetStateAction<CommonSetupFormValues>
  >;
  handleBack: () => void;
  handleNext: () => void;
}

/**
 * Add new app stepper view containing common application configuration (required by all apps).
 */
export default function CommonSetupView({
  commonSetupValues,
  setCommonSetupValues,
  handleBack,
  handleNext,
}: CommonSetupViewProps) {
  const isInstanceNameEmptyError = !!!commonSetupValues.instanceName;
  const isDescriptionEmptyError = !!!commonSetupValues.description;
  const isPathEmptyError = !!!commonSetupValues.path;
  const isPathInvalidError = !(
    commonSetupValues.path.startsWith("/") && commonSetupValues.path.length > 1
  );
  let pathHelperText = regularPathHelperText;
  if (isPathEmptyError) {
    pathHelperText = emptyFormHelperText;
  } else if (isPathInvalidError) {
    pathHelperText = illformedPathHelperText;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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
          width: "50%",
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingTop: 2,
        }}
      >
        <Button color="inherit" onClick={handleBack} sx={{ marginRight: 1 }}>
          Back
        </Button>
        <Button variant="outlined" onClick={handleNext}>
          Next
        </Button>
      </Box>
    </>
  );
}
