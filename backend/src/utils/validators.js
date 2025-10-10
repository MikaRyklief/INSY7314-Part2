const NAME_REGEX = /^[A-Za-z ,.'-]{2,60}$/;
const SOUTH_AFRICAN_ID_REGEX = /^\d{13}$/;
const ACCOUNT_REGEX = /^\d{10,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/;
const EMPLOYEE_ID_REGEX = /^[A-Z0-9]{4,20}$/;
const AMOUNT_REGEX = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const BENEFICIARY_ACCOUNT_REGEX = /^[A-Z0-9]{8,34}$/;
const SWIFT_REGEX = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const PROVIDERS = ['SWIFT', 'SEPA', 'FEDWIRE'];
export const PAYMENT_REVIEW_DECISIONS = ['verified', 'rejected'];

export const validateRegistrationPayload = (payload) => {
  const errors = [];
  if (!NAME_REGEX.test(payload.fullName || '')) {
    errors.push('Full name may only contain letters, spaces, commas, apostrophes, and hyphens (2-60 characters).');
  }
  if (!SOUTH_AFRICAN_ID_REGEX.test(payload.idNumber || '')) {
    errors.push('ID number must be a 13 digit South African ID.');
  }
  if (!ACCOUNT_REGEX.test(payload.accountNumber || '')) {
    errors.push('Account number must be 10-20 digits.');
  }
  if (!PASSWORD_REGEX.test(payload.password || '')) {
    errors.push('Password must be at least 12 characters and include upper, lower, digit and special character.');
  }
  return errors;
};

export const validateLoginPayload = (payload) => {
  const errors = [];
  if (!SOUTH_AFRICAN_ID_REGEX.test(payload.username || '')) {
    errors.push('Username must be the 13 digit ID number used at registration.');
  }
  if (!ACCOUNT_REGEX.test(payload.accountNumber || '')) {
    errors.push('Account number must be 10-20 digits.');
  }
  if (!PASSWORD_REGEX.test(payload.password || '')) {
    errors.push('Password format is invalid.');
  }
  return errors;
};

export const validateEmployeeLoginPayload = (payload) => {
  const errors = [];
  if (!EMPLOYEE_ID_REGEX.test((payload.employeeId || '').toUpperCase())) {
    errors.push('Employee ID must be 4-20 alphanumeric characters.');
  }
  if (!PASSWORD_REGEX.test(payload.password || '')) {
    errors.push('Password format is invalid.');
  }
  return errors;
};

export const validatePaymentPayload = (payload) => {
  const errors = [];
  const amount = String(payload.amount ?? '');
  const currency = String(payload.currency ?? '').toUpperCase();
  const provider = String(payload.provider ?? '').toUpperCase();
  const beneficiaryAccount = String(payload.beneficiaryAccount ?? '').toUpperCase();
  const swiftCode = String(payload.swiftCode ?? '').toUpperCase();

  if (!AMOUNT_REGEX.test(amount)) {
    errors.push('Amount must be a valid number with up to two decimal places.');
  }
  if (!CURRENCY_REGEX.test(currency)) {
    errors.push('Currency must be a 3 letter ISO code.');
  }
  if (!PROVIDERS.includes(provider)) {
    errors.push('Provider is not supported.');
  }
  if (!BENEFICIARY_ACCOUNT_REGEX.test(beneficiaryAccount)) {
    errors.push('Beneficiary account must be 8-34 alphanumeric characters.');
  }
  if (!SWIFT_REGEX.test(swiftCode)) {
    errors.push('SWIFT code must follow ISO 9362.');
  }
  return errors;
};

export const validatePaymentReviewPayload = (payload) => {
  const errors = [];
  const decision = String(payload.status ?? '').toLowerCase();
  if (!PAYMENT_REVIEW_DECISIONS.includes(decision)) {
    errors.push('Status must be one of: verified or rejected.');
  }
  return errors;
};
