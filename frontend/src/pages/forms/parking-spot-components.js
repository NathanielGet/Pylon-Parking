import React, { useState } from 'react';
import IconButton from '@material-ui/core/IconButton';
import 'date-fns';
import Grid from '@material-ui/core/Grid';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import InputAdornment from '@material-ui/core/InputAdornment';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

const CostField = props => {
  const { cost } = props;

  return (
    <>
      <TextField
        disabled
        id="filled-disabled"
        label="Approximate Price"
        defaultValue="Enter an End Time"
        value={cost}
        variant="filled"
      />
    </>
  );
};

// The private key is stored in the 'key' property of the privateKey object,
// which is a state and is the time state originally.
const PrivateKeyField = props => {
  const { privateKey, updatePrivateKey } = props;

  const handleChange = () => event => {
    updatePrivateKey({ ...privateKey, privateKey: event.target.value });
  };

  const handleClickShowKey = () => {
    updatePrivateKey({
      ...privateKey,
      showPrivateKey: !privateKey.showPrivateKey
    });
  };

  return (
    <>
      <FormControl variant="outlined">
        <InputLabel>Private Key</InputLabel>
        <OutlinedInput
          id="private-key"
          type={privateKey.showPrivateKey ? 'text' : 'password'}
          value={privateKey.privateKey}
          onChange={handleChange()}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowKey}
                edge="end"
              >
                {privateKey.showPrivateKey ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
          labelWidth={70}
        />
      </FormControl>
    </>
  );
};

const TimePicker = props => {
  const { handleTimeChange, time, name, label, hasError, errorMessage } = props;

  if (hasError === undefined) {
    hasError = false;
  }

  if (errorMessage === undefined) {
    errorMessage = '';
  }

  return (
    <TextField
      error={hasError}
      label={label}
      name={name}
      type="time"
      value={time}
      onChange={handleTimeChange}
      helperText={errorMessage}
      InputLabelProps={{
        shrink: true
      }}
      inputProps={{
        step: 900
      }}
    />
  );
};

const ConfirmationDialogFieldButton = props => {
  const {
    buttonMessage,
    messageTitle,
    messageContent,
    handleOnConfirm,
    privateKey,
    updatePrivateKey,
    buttonColor
  } = props;
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = isAgree => {
    setOpen(false);

    // privateKey is the time state
    // time state has start time and end time.
    if (isAgree) {
      handleOnConfirm(privateKey.privateKey);
    } else {
      updatePrivateKey({
        privateKey: '',
        showPrivateKey: false,
      })
    }
  };

  return (
    <div>
      <Button variant="outlined" color={buttonColor} onClick={handleClickOpen}>
        {buttonMessage}
      </Button>
      <Dialog open={open} onClose={() => handleClose(false)}>
        <DialogTitle>{messageTitle}</DialogTitle>
        <DialogContent>
          <Grid>
            {messageContent}
          </Grid>
          <Grid>
            <PrivateKeyField
              privateKey={privateKey}
              updatePrivateKey={updatePrivateKey}
            />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleClose(true)} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const StartEndTime = props => {
  const {
    time,
    buttonName,
    updateTime,
    popUpTitle,
    popUpContent,
    handleOnConfirm,
    calculateCost
  } = props;

  const [cost, updateCost] = useState('N/A');
  const [privateKey, updatePrivateKey] = useState({
    privateKey: '',
    showPrivateKey: false,
  })

  const handleTimeChange = event => {
    let { name, value } = event.target;
    updateTime({ ...time, [name]: value });
    updateCost(calculateCost(time.startTime, time.endTime));
  };

  return (
    <>
      <Grid>
        <TimePicker
          handleTimeChange={handleTimeChange}
          time={time.startTime}
          name={'startTime'}
          label={'Start Time'}
        />
        <TimePicker
          handleTimeChange={handleTimeChange}
          time={time.endTime}
          name={'endTime'}
          label={'End Time'}
        />
        <ConfirmationDialogFieldButton
          buttonMessage={buttonName}
          messageTitle={popUpTitle}
          messageContent={popUpContent}
          handleOnConfirm={handleOnConfirm}
          privateKey={privateKey}
          updatePrivateKey={updatePrivateKey}
          buttonColor='primary'
        />
      </Grid>
      <Grid>
        <CostField cost={cost} />
      </Grid>
    </>
  );
};

export {
  StartEndTime,
  ConfirmationDialogFieldButton,
  PrivateKeyField,
  CostField,
  TimePicker,
};
