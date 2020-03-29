import React, { useState, useEffect } from 'react';
import { makeAPICall } from '../api';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableFooter from '@material-ui/core/TableFooter';
import TableRow from '@material-ui/core/TableRow';
import TablePagination from '@material-ui/core/TablePagination';
import apiprefix from './apiprefix';
import 'date-fns';
import { Typography, Select } from '@material-ui/core';
import queryStrings from 'query-string';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import { 
  convertEpochToMilitary, 
  convertMilitaryToEpoch
} from './forms/time-filter';
import {
  withStyles,
  withTheme,
  MuiThemeProvider,
  createMuiTheme
} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    display: 'flex',
    flexGrow: 1
  },
  tabLink: {
    color: theme.palette.secondary.main
  }
});

const FilterSelectField = ({ classes, ...props }) => {
  const { listOfFilterOptions, filterOption, updateFilterOption } = props;

  const handleChange = event => {
    updateFilterOption(event.target.value);
  };

  // displays the menu item with the same value as the current filterOption.
  return (
    <>
      <Select value={filterOption} onChange={handleChange}>
        {listOfFilterOptions.map(e => (
          <MenuItem value={e}>{e}</MenuItem>
        ))}
      </Select>
    </>
  );
};

// Does not return anything.
// Updates the current list of transaction to display.
const getEntriesForPage = (page, numEntriesPerPage, listOfTransactions) => {
  if (page === -1) {
    return listOfTransactions;
  }

  const startIndex = page * numEntriesPerPage;
  let endIndex = startIndex + numEntriesPerPage;

  if (startIndex > listOfTransactions.length) {
    return null; // Change to the last page instead. And Update URL.
  }

  if (endIndex > listOfTransactions.length) {
    endIndex = listOfTransactions.length;
  }

  // return listOfTransactions.slice(startIndex, endIndex);
  return [];
};

const TransactionTableHeader = props => {
  const { tableHeaders } = props;

  return (
    <>
      <TableHead>
        <TableRow>
          <TableCell>{tableHeaders.parkingId}</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
    </>
  );
};

const TransactionsTableBody = ({
  page,
  numEntriesPerPage,
  listOfTransactions,
  ...props
}) => {
  const rows = getEntriesForPage(page, numEntriesPerPage, listOfTransactions);

  return (
    <>
      <TableBody>
        {rows.map(row => (
          <TableRow>
            <TableCell>{row.parkingId}</TableCell>
            <TableCell />
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

const TransactionTable = ({
  userId,
  listOfTransactions,
  page,
  updatePage,
  numEntriesPerPage,
  updateNumEntriesPerPage,
  tableHeaders,
  ...props
}) => {
  const listOfFilterOptions = ['Parking ID', 'Buyer ID', 'Seller ID'];
  const [filterOption, updateFilterOption] = useState('Buyer ID');
  const [textFieldValue, updateTextFieldValue] = useState(userId);
  const [displayList, updateDisplayList] = useState(listOfTransactions);

  const handleChangePage = (event, newPage) => {
    updatePage(newPage);
  };

  const handleChangeNumEntriesPerPage = event => {
    updateNumEntriesPerPage(parseInt(event.target.value, 10));
    updatePage(0);
  };

  const handleTextFieldChange = event => {
    updateTextFieldValue(event.target.value);
  };

  const handleClickFilter = event => {
    const temp = listOfTransactions.filter(
      e => e[filterOption] === textFieldValue
    );
    updateDisplayList(temp);
  };

  //Not sure what it does.

  /*
SelectProps={{
          inputProps: { 'aria-label': 'rows per page' },
          native: true,
        }}
  */

  // Add in filtering option?
  // Filter by a specific parking id, buyer or seller.
  return (
    <>
      <div>
        <FilterSelectField
          listOfFilterOptions={listOfFilterOptions}
          filterOption={filterOption}
          updateFilterOption={updateFilterOption}
        />
        <TextField
          label={`Enter a ${filterOption}`}
          value={textFieldValue}
          onChange={handleTextFieldChange}
        />
        <Button variant="contained" color="primary" onClick={handleClickFilter}>
          Filter!
        </Button>
      </div>
      <Table stickyHeader>
        <TransactionTableHeader tableHeaders={tableHeaders} />
        <TransactionsTableBody
          listOfTransactions={displayList}
          page={page}
          numEntriesPerPage={numEntriesPerPage}
        />
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
          colSpan={3}
          count={displayList.length}
          rowsPerPage={numEntriesPerPage}
          page={page}
          onChangePage={handleChangePage}
          onChangeRowsPerPage={handleChangeNumEntriesPerPage}
        />
      </Table>
    </>
  );
};

// Must change if including the parking spot times.
const handleNewTransaction = (
  listOfTransactions,
  updateListOfTransactions,
  newTransaction
) => {
  listOfTransactions.unshift(newTransaction);
  updateListOfTransactions(listOfTransactions);
};

// Must change epoch if any to military time.
const TransactionHistory = ({ socket, ...props }) => {
  const [message, updateMessage] = useState('Loading');
  const [listOfTransactions, updateListOfTransactions] = useState([]);
  const [page, updatePage] = useState(0);
  const [numEntriesPerPage, updateNumEntriesPerPage] = useState(10);

  // Table header.
  const tableHeaders = {
    parkingId: 'Parking ID',
    sellerId: 'Seller ID',
    buyerId: 'Buyer ID'
  };

  //const url = `/transaction_history`;
  const url = `${apiprefix}/transaction_history`;

  const getTransactionHistory = async () => {
    const response = await makeAPICall('GET', url);
    const respbody = await response.json();

    if (response.status === 200) {
      const queryParams = queryStrings.parse(window.location.search);

      if (
        queryParams.page !== undefined &&
        isNaN(queryParams.page) !== false &&
        Number(queryParams.page) !== page
      ) {
        updatePage(Number(queryParams.page));
      }

      if (
        queryParams.numEntries !== undefined &&
        isNaN(queryParams.numEntries) !== false &&
        Number(queryParams.numEntries) !== numEntriesPerPage
      ) {
        updateNumEntriesPerPage(Number(queryParams.numEntries));
      }

      updateListOfTransactions(respbody.listOfTransactions);
    } else {
      updateMessage('Error has occurred');
    }
  };


  useEffect(() => {
    getTransactionHistory();
  }, []);

  useEffect(() => {
    socket.on('transactionHistory', data =>
      handleNewTransaction(listOfTransactions, updateListOfTransactions, data)
    );
  }, []);

  return (
    <>
      <div>
        {message ? (
          <Typography>{message}</Typography>
        ) : (
          <Typography>
            <TransactionTable
              listOfTransactions={listOfTransactions}
              page={page}
              updatePage={updatePage}
              numEntriesPerPage={numEntriesPerPage}
              updateNumEntriesPerPage={updateNumEntriesPerPage}
              tableHeaders={tableHeaders}
            />
          </Typography>
        )}
      </div>
    </>
  );
};

export default withTheme(withStyles(styles)(TransactionHistory));
