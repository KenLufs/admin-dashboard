'use client';
import PropTypes from 'prop-types';
import { useState } from 'react';

// next
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import FormHelperText from '@mui/material/FormHelperText';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import Box from '@mui/material/Box';

// third-party
import * as yup from 'yup';
import { v4 as UIDV4 } from 'uuid';
import { format } from 'date-fns';
import { FieldArray, Form, Formik } from 'formik';

// project-imports
import MainCard from 'components/MainCard';
import CircularLoader from 'components/CircularLoader';
import Breadcrumbs from 'components/@extended/Breadcrumbs';
import InvoiceItem from 'sections/apps/invoice/InvoiceItem';
import AddressModal from 'sections/apps/invoice/AddressModal';
import InvoiceModal from 'sections/apps/invoice/InvoiceModal';

import { APP_DEFAULT_PATH } from 'config';
import incrementer from 'utils/incrementer';
import { openSnackbar } from 'api/snackbar';

import { handlerCustomerTo, handlerCustomerFrom, handlerPreview, insertInvoice, useGetInvoice, useGetInvoiceMaster } from 'api/invoice';

// assets
import { Add, Edit } from 'iconsax-react';

const validationSchema = yup.object({
  date: yup.date().required('Invoice date is required'),
  due_date: yup
    .date()
    .when('date', (date, schema) => date && schema.min(date, "Due date can't be before invoice date"))
    .nullable()
    .required('Due date is required'),
  customerInfo: yup
    .object({
      name: yup.string().required('Invoice receiver information is required')
    })
    .required('Invoice receiver information is required'),
  country: yup.object().nullable().required('Please select a currency'),
  status: yup.string().required('Status selection is required'),
  country: yup.object().nullable().required('Please select a currency'),
  status: yup.string().required('Status selection is required'),
  invoice_detail: yup
    .array()
    .required('Invoice details is required')
    .of(
      yup.object().shape({
        name: yup.string().required('Product name is required')
      })
    )
    .min(1, 'Invoice must have at least 1 items')
});

// ==============================|| INVOICE CREATE - FORM ||============================== //

function CreateForm({ lists, invoiceMaster }) {
  const router = useRouter();
  const [country, setCountry] = useState(invoiceMaster.countries[0]);

  const notesLimit = 500;

  const handlerCreate = (values) => {
    const newList = {
      id: Number(incrementer(lists.length)),
      invoice_id: Number(values.invoice_id),
      customer_name: values.cashierInfo?.name,
      email: values.cashierInfo?.email,
      avatar: Number(Math.round(Math.random() * 10)),
      discount: Number(values.discount),
      tax: Number(values.tax),
      date: format(new Date(values.date), 'MM/dd/yyyy'),
      due_date: format(new Date(values.due_date), 'MM/dd/yyyy'),
      quantity: Number(
        values.invoice_detail?.reduce((sum, i) => {
          return sum + i.qty;
        }, 0)
      ),
      status: values.status,
      cashierInfo: values.cashierInfo,
      customerInfo: values.customerInfo,
      invoice_detail: values.invoice_detail,
      notes: values.notes
    };

    insertInvoice(newList);
    openSnackbar({
      open: true,
      message: 'Invoice Added successfully',
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      variant: 'alert',
      alert: {
        color: 'success'
      }
    });
    router.push('/apps/invoice/list');
  };

  return (
    <Formik
      initialValues={{
        id: 120,
        invoice_id: Date.now(),
        status: '',
        date: new Date(),
        due_date: null,
        cashierInfo: {
          name: 'Belle J. Richter',
          address: '1300 Cooks Mine, NM 87829',
          phone: '305-829-7809',
          email: 'belljrc23@gmail.com'
        },
        customerInfo: {
          address: '',
          email: '',
          name: '',
          phone: ''
        },
        invoice_detail: [
          {
            id: UIDV4(),
            name: '',
            description: '',
            qty: 1,
            price: '1.00'
          }
        ],
        discount: 0,
        tax: 0,
        notes: '',
        country: invoiceMaster.countries[2]
      }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        handlerCreate(values);
      }}
    >
      {({ handleBlur, errors, handleChange, handleSubmit, values, isValid, setFieldValue, touched }) => {
        const subtotal = values?.invoice_detail.reduce((prev, curr) => {
          if (curr.name.trim().length > 0) return prev + Number(curr.price * Math.floor(curr.qty));
          else return prev;
        }, 0);
        const taxRate = (values.tax * subtotal) / 100;
        const discountRate = (values.discount * subtotal) / 100;
        const total = subtotal - discountRate + taxRate;
        return (
          <Form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <InputLabel>Invoice Id</InputLabel>
                  <FormControl sx={{ width: '100%' }}>
                    <TextField
                      required
                      disabled
                      type="number"
                      name="invoice_id"
                      id="invoice_id"
                      value={values.invoice_id}
                      onChange={handleChange}
                    />
                  </FormControl>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <InputLabel>Status</InputLabel>
                  <FormControl sx={{ width: '100%' }}>
                    <Select
                      value={values.status}
                      displayEmpty
                      name="status"
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return <Box sx={{ color: 'secondary.400' }}>Select status</Box>;
                        }
                        return selected;
                        // return selected.join(', ');
                      }}
                      onChange={handleChange}
                      error={Boolean(errors.status && touched.status)}
                    >
                      <MenuItem disabled value="">
                        Select status
                      </MenuItem>
                      <MenuItem value="Paid">Paid</MenuItem>
                      <MenuItem value="Unpaid">Unpaid</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                {touched.status && errors.status && <FormHelperText error={true}>{errors.status}</FormHelperText>}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <InputLabel>Date</InputLabel>
                  <FormControl sx={{ width: '100%' }} error={Boolean(touched.date && errors.date)}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker format="dd/MM/yyyy" value={values.date} onChange={(newValue) => setFieldValue('date', newValue)} />
                    </LocalizationProvider>
                  </FormControl>
                </Stack>
                {touched.date && errors.date && <FormHelperText error={true}>{errors.date}</FormHelperText>}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <InputLabel>Due Date</InputLabel>
                  <FormControl sx={{ width: '100%' }} error={Boolean(touched.due_date && errors.due_date)}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        format="dd/MM/yyyy"
                        value={values.due_date}
                        onChange={(newValue) => setFieldValue('due_date', newValue)}
                      />
                    </LocalizationProvider>
                  </FormControl>
                </Stack>
                {touched.due_date && errors.due_date && <FormHelperText error={true}>{errors.due_date}</FormHelperText>}
              </Grid>

              <Grid item xs={12} sm={6}>
                <MainCard sx={{ minHeight: 168 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <Stack spacing={2}>
                        <Typography variant="h5">From:</Typography>
                        <Stack sx={{ width: '100%' }}>
                          <Typography variant="subtitle1">{values?.cashierInfo?.name}</Typography>
                          <Typography color="secondary">{values?.cashierInfo?.address}</Typography>
                          <Typography color="secondary">{values?.cashierInfo?.phone}</Typography>
                          <Typography color="secondary">{values?.cashierInfo?.email}</Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box textAlign={{ xs: 'left', sm: 'right' }} color="grey.200">
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          color="secondary"
                          onClick={() => handlerCustomerFrom(true)}
                          size="small"
                        >
                          Change
                        </Button>
                        <AddressModal
                          open={invoiceMaster.open}
                          setOpen={(value) => handlerCustomerFrom(value)}
                          handlerAddress={(address) => setFieldValue('cashierInfo', address)}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </MainCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MainCard sx={{ minHeight: 168 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <Stack spacing={2}>
                        <Typography variant="h5">To:</Typography>
                        <Stack sx={{ width: '100%' }}>
                          <Typography variant="subtitle1">{values?.customerInfo?.name}</Typography>
                          <Typography color="secondary">{values?.customerInfo?.address}</Typography>
                          <Typography color="secondary">{values?.customerInfo?.phone}</Typography>
                          <Typography color="secondary">{values?.customerInfo?.email}</Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box textAlign="right" color="grey.200">
                        <Button
                          size="small"
                          startIcon={<Add />}
                          color="secondary"
                          variant="outlined"
                          onClick={() => handlerCustomerTo(true)}
                        >
                          Add
                        </Button>
                        <AddressModal
                          open={invoiceMaster.isCustomerOpen}
                          setOpen={(value) => handlerCustomerTo(value)}
                          handlerAddress={(value) => setFieldValue('customerInfo', value)}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </MainCard>
                {touched.customerInfo && errors.customerInfo && <FormHelperText error={true}>{errors?.customerInfo?.name}</FormHelperText>}
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5">Detail</Typography>
              </Grid>
              <Grid item xs={12}>
                <FieldArray
                  name="invoice_detail"
                  render={({ remove, push }) => {
                    return (
                      <>
                        <TableContainer>
                          <Table sx={{ minWidth: 650 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Qty</TableCell>
                                <TableCell align="right">Price</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="center">Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {values.invoice_detail?.map((item, index) => (
                                <TableRow key={item.id}>
                                  <TableCell>{values.invoice_detail.indexOf(item) + 1}</TableCell>
                                  <InvoiceItem
                                    key={item.id}
                                    id={item.id}
                                    index={index}
                                    name={item.name}
                                    description={item.description}
                                    qty={item.qty}
                                    price={item.price}
                                    country={country}
                                    onDeleteItem={(index) => remove(index)}
                                    onEditItem={handleChange}
                                    Blur={handleBlur}
                                    errors={errors}
                                    touched={touched}
                                  />
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Divider />
                        {touched.invoice_detail && errors.invoice_detail && !Array.isArray(errors?.invoice_detail) && (
                          <Stack direction="row" justifyContent="center" sx={{ p: 1.5 }}>
                            <FormHelperText error={true}>{errors.invoice_detail}</FormHelperText>
                          </Stack>
                        )}
                        <Grid container justifyContent="space-between">
                          <Grid item xs={12} md={8}>
                            <Box sx={{ pt: 2.5, pr: 2.5, pb: 2.5, pl: 0 }}>
                              <Button
                                color="primary"
                                startIcon={<Add />}
                                onClick={() =>
                                  push({
                                    id: UIDV4(),
                                    name: '',
                                    description: '',
                                    qty: 1,
                                    price: '1.00'
                                  })
                                }
                                variant="dashed"
                                sx={{ bgcolor: 'transparent !important' }}
                              >
                                Add Item
                              </Button>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Grid container justifyContent="space-between" spacing={2} sx={{ pt: 2.5, pb: 2.5 }}>
                              <Grid item xs={6}>
                                <Stack spacing={1}>
                                  <InputLabel>Discount(%)</InputLabel>
                                  <TextField
                                    type="number"
                                    fullWidth
                                    name="discount"
                                    id="discount"
                                    placeholder="0.0"
                                    value={values.discount}
                                    onChange={handleChange}
                                    inputProps={{
                                      min: 0
                                    }}
                                  />
                                </Stack>
                              </Grid>
                              <Grid item xs={6}>
                                <Stack spacing={1}>
                                  <InputLabel>Tax(%)</InputLabel>
                                  <TextField
                                    type="number"
                                    fullWidth
                                    name="tax"
                                    id="tax"
                                    placeholder="0.0"
                                    value={values.tax}
                                    onChange={handleChange}
                                    inputProps={{
                                      min: 0
                                    }}
                                  />
                                </Stack>
                              </Grid>
                            </Grid>
                            <Grid item xs={12}>
                              <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography color="grey.500">Sub Total:</Typography>
                                  <Typography>{`${country?.prefix ?? ''} ${subtotal.toFixed(2)}`}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography color="grey.500">Discount:</Typography>
                                  <Typography variant="h6" color="success.main">
                                    {`${country?.prefix ?? ''} ${discountRate.toFixed(2)}`}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography color="grey.500">Tax:</Typography>
                                  <Typography>{`${country?.prefix ?? ''} ${taxRate.toFixed(2)}`}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="subtitle1">Grand Total:</Typography>
                                  <Typography variant="subtitle1">
                                    {total % 1 === 0
                                      ? (country?.prefix ?? '') + ' ' + total
                                      : (country?.prefix ?? '') + ' ' + total.toFixed(2)}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Grid>
                          </Grid>
                        </Grid>
                      </>
                    );
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel>Notes</InputLabel>
                  <TextField
                    placeholder="Notes"
                    rows={3}
                    value={values.notes}
                    multiline
                    name="notes"
                    onChange={handleChange}
                    inputProps={{
                      maxLength: notesLimit
                    }}
                    helperText={`${values.notes.length} / ${notesLimit}`}
                    sx={{
                      width: '100%',
                      '& .MuiFormHelperText-root': {
                        mr: 0,
                        display: 'flex',
                        justifyContent: 'flex-end'
                      }
                    }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel>Set Currency*</InputLabel>
                  <FormControl sx={{ width: { xs: '100%', sm: 250 } }}>
                    <Autocomplete
                      id="country-select"
                      options={invoiceMaster.countries}
                      value={country}
                      onChange={(event, value) => {
                        setCountry(value);
                        setFieldValue('country', value);
                      }}
                      autoHighlight
                      clearIcon={null}
                      getOptionLabel={(option) => option.label}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props; // Extract key and spread the rest

                        return (
                          <Stack key={key} component="li" direction="row" alignItems="center" gap={1} {...otherProps}>
                            {option.code && (
                              <Image
                                loading="lazy"
                                className="flagImg"
                                width={20}
                                height={14}
                                alt={`${option.code.toLowerCase()}.png`}
                                src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
                              />
                            )}
                            {option.label}
                          </Stack>
                        );
                      }}
                      renderInput={(params) => {
                        const selected = invoiceMaster.countries.find((option) => option.code === country?.code);
                        return (
                          <TextField
                            {...params}
                            name="country"
                            placeholder="Select"
                            value={values.country ? values.country.label : ''} // Controlled value for the TextField
                            error={touched.country && Boolean(errors.country)}
                            helperText={
                              touched.country &&
                              (Array.isArray(errors.country)
                                ? errors.country.join(', ')
                                : typeof errors.country === 'string' && errors.country)
                            }
                            sx={{ '.flagImg': { objectFit: 'contain' } }}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  {selected && selected.code && (
                                    <Image
                                      loading="lazy"
                                      width={20}
                                      height={14}
                                      className="flagImg"
                                      alt={`${selected.code.toLowerCase()}.png`}
                                      src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
                                    />
                                  )}
                                </>
                              )
                            }}
                          />
                        );
                      }}
                    />
                  </FormControl>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Stack direction="row" justifyContent="flex-end" alignItems="flex-end" spacing={2} sx={{ height: '100%' }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    disabled={values.status === '' || !isValid}
                    sx={{ color: 'secondary.dark' }}
                    onClick={() => handlerPreview(true)}
                  >
                    Preview
                  </Button>
                  <Button variant="outlined" color="secondary" sx={{ color: 'secondary.dark' }}>
                    Save
                  </Button>
                  <Button color="primary" variant="contained" type="submit">
                    Create & Send
                  </Button>
                  <InvoiceModal
                    isOpen={invoiceMaster.isOpen}
                    setIsOpen={(value) => handlerPreview(value)}
                    key={values.invoice_id}
                    invoiceInfo={{
                      ...values,
                      subtotal,
                      taxRate,
                      discountRate,
                      total
                    }}
                    items={values?.invoice_detail}
                    onAddNextInvoice={() => handlerPreview(false)}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Form>
        );
      }}
    </Formik>
  );
}

// ==============================|| INVOICE - CREATE ||============================== //

export default function Create() {
  const { invoice } = useGetInvoice();
  const { invoiceMasterLoading, invoiceMaster } = useGetInvoiceMaster();

  const isLoader = invoiceMasterLoading || invoiceMaster === undefined;
  const loader = (
    <Box sx={{ height: 'calc(100vh - 310px)' }}>
      <CircularLoader />
    </Box>
  );

  let breadcrumbLinks = [
    { title: 'Home', to: APP_DEFAULT_PATH },
    { title: 'Invoice', to: '/apps/invoice/dashboard' },
    { title: 'Create Invoice' }
  ];

  return (
    <>
      <Breadcrumbs custom heading="New Invoice" links={breadcrumbLinks} />
      <MainCard>{isLoader ? loader : <CreateForm {...{ lists: invoice, invoiceMaster }} />}</MainCard>
    </>
  );
}

CreateForm.propTypes = {
  lists: PropTypes.array,
  invoiceMaster: PropTypes.any,
  key: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
