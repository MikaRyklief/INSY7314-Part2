import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { config } from '../config.js';
import { hashPasswordSync } from '../utils/passwords.js';

let client;
let database;

const DEFAULT_CUSTOMERS = [
  {
    fullName: 'Nomsa Dlamini',
    idNumber: '8501011234088',
    accountNumber: '110000123456',
    passwordHash: hashPasswordSync('Customer!2024')
  },
  {
    fullName: 'Daniel Naidoo',
    idNumber: '9005057654085',
    accountNumber: '210098765432',
    passwordHash: hashPasswordSync('GlobalPay!2024')
  }
];

const DEFAULT_EMPLOYEES = [
  {
    fullName: 'International Operations Officer',
    employeeId: 'OPS001',
    passwordHash: hashPasswordSync('OpsPortal!2024')
  }
];

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return database;
};

const getCollection = (name) => getDb().collection(name);

// Convert inbound identifiers into safe ObjectIds to prevent injection via crafted strings
const toObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof ObjectId) {
    return value;
  }

  if (ObjectId.isValid(value)) {
    return new ObjectId(value);
  }

  return null;
};

export const isValidDocumentId = (value) => ObjectId.isValid(value);

const mapCustomer = (doc) => {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    idNumber: doc.idNumber,
    accountNumber: doc.accountNumber,
    createdAt: doc.createdAt
  };
};

const mapPayment = (doc) => {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    customerId: doc.customerId?.toString(),
    amount: doc.amount,
    currency: doc.currency,
    provider: doc.provider,
    beneficiaryAccount: doc.beneficiaryAccount,
    swiftCode: doc.swiftCode,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapPaymentWithCustomer = (paymentDoc, customerDoc) => {
  const payment = mapPayment(paymentDoc);
  if (!payment) {
    return null;
  }

  return {
    ...payment,
    customerName: customerDoc?.fullName || 'Unknown customer',
    customerAccountNumber: customerDoc?.accountNumber || 'Unknown account'
  };
};

const seedCustomers = async (customersCollection) => {
  if (!DEFAULT_CUSTOMERS.length) {
    return;
  }

  const operations = DEFAULT_CUSTOMERS.map((customer) => ({
    updateOne: {
      filter: {
        idNumber: customer.idNumber,
        accountNumber: customer.accountNumber
      },
      update: {
        $setOnInsert: {
          fullName: customer.fullName,
          idNumber: customer.idNumber,
          accountNumber: customer.accountNumber,
          passwordHash: customer.passwordHash,
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  await customersCollection.bulkWrite(operations, { ordered: false });
};

const seedEmployees = async (employeesCollection) => {
  if (!DEFAULT_EMPLOYEES.length) {
    return;
  }

  const operations = DEFAULT_EMPLOYEES.map((employee) => ({
    updateOne: {
      filter: { employeeId: employee.employeeId },
      update: {
        $setOnInsert: {
          fullName: employee.fullName,
          employeeId: employee.employeeId,
          searchEmployeeId: employee.employeeId.toUpperCase(),
          passwordHash: employee.passwordHash,
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  await employeesCollection.bulkWrite(operations, { ordered: false });
};

// Hardening indexes enforce uniqueness and fast lookup to resist injection-style abuse
const ensureIndexesAndSeed = async () => {
  const customers = getCollection('customers');
  const payments = getCollection('payments');
  const employees = getCollection('employees');

  await Promise.all([
    customers.createIndex({ idNumber: 1 }, { unique: true, name: 'unique_id_number' }),
    customers.createIndex({ accountNumber: 1 }, { unique: true, name: 'unique_account_number' }),
    payments.createIndex({ customerId: 1, createdAt: -1 }, { name: 'customer_created_at' }),
    payments.createIndex({ status: 1 }, { name: 'payment_status' }),
    employees.createIndex({ employeeId: 1 }, { unique: true, name: 'unique_employee_id' }),
    employees.createIndex({ searchEmployeeId: 1 }, { unique: true, name: 'unique_employee_id_lookup' })
  ]);

  await seedCustomers(customers);
  await seedEmployees(employees);
};

export const initializeDatabase = async () => {
  if (database) {
    return database;
  }

  if (!config.mongo?.uri) {
    throw new Error('Missing MongoDB connection string (MONGO_URI).');
  }

  if (!config.mongo?.dbName) {
    throw new Error('Missing MongoDB database name (MONGO_DB_NAME).');
  }

  client = new MongoClient(config.mongo.uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });

  await client.connect();
  database = client.db(config.mongo.dbName);
  await ensureIndexesAndSeed();
  return database;
};

export const findCustomerByCredentials = async ({ idNumber, accountNumber }) => {
  const customers = getCollection('customers');
  const doc = await customers.findOne(
    { idNumber, accountNumber },
    {
      projection: {
        fullName: 1,
        idNumber: 1,
        accountNumber: 1,
        passwordHash: 1,
        createdAt: 1
      }
    }
  );

  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    idNumber: doc.idNumber,
    accountNumber: doc.accountNumber,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt
  };
};

export const findCustomerById = async (customerId) => {
  const customers = getCollection('customers');
  const objectId = toObjectId(customerId);
  if (!objectId) {
    return null;
  }

  const doc = await customers.findOne(
    { _id: objectId },
    { projection: { fullName: 1, idNumber: 1, accountNumber: 1, createdAt: 1 } }
  );

  return mapCustomer(doc);
};

export const listPaymentsForCustomer = async (customerId) => {
  const payments = getCollection('payments');
  const objectId = toObjectId(customerId);
  if (!objectId) {
    return [];
  }

  const docs = await payments
    .find({ customerId: objectId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(mapPayment);
};

export const createPayment = async ({
  customerId,
  amount,
  currency,
  provider,
  beneficiaryAccount,
  swiftCode
}) => {
  const payments = getCollection('payments');
  const customerObjectId = toObjectId(customerId);
  if (!customerObjectId) {
    const error = new Error('Invalid customer identifier.');
    error.code = 'INVALID_CUSTOMER_ID';
    throw error;
  }

  const now = new Date();
  const result = await payments.insertOne({
    customerId: customerObjectId,
    amount,
    currency,
    provider,
    beneficiaryAccount,
    swiftCode,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  });

  return { id: result.insertedId.toString() };
};

export const findPaymentById = async (paymentId) => {
  const payments = getCollection('payments');
  const objectId = toObjectId(paymentId);
  if (!objectId) {
    return null;
  }

  const doc = await payments.findOne({ _id: objectId });
  return mapPayment(doc);
};

const buildPaymentReviewPipeline = (matchStage) => [
  { $match: matchStage },
  {
    $lookup: {
      from: 'customers',
      localField: 'customerId',
      foreignField: '_id',
      as: 'customer'
    }
  },
  {
    $unwind: {
      path: '$customer',
      preserveNullAndEmptyArrays: true
    }
  },
  { $sort: { createdAt: -1 } }
];

export const listPaymentsForReview = async () => {
  const payments = getCollection('payments');
  const docs = await payments.aggregate(buildPaymentReviewPipeline({})).toArray();
  return docs.map((doc) => mapPaymentWithCustomer(doc, doc.customer));
};

export const findPaymentForReview = async (paymentId) => {
  const payments = getCollection('payments');
  const objectId = toObjectId(paymentId);
  if (!objectId) {
    return null;
  }

  const pipeline = [
    ...buildPaymentReviewPipeline({ _id: objectId }),
    { $limit: 1 }
  ];
  const docs = await payments.aggregate(pipeline).toArray();

  if (!docs.length) {
    return null;
  }

  const doc = docs[0];
  return mapPaymentWithCustomer(doc, doc.customer);
};

export const findEmployeeByCredentials = async ({ employeeId }) => {
  const employees = getCollection('employees');
  const normalizedId = employeeId.trim().toUpperCase();

  const doc = await employees.findOne(
    { searchEmployeeId: normalizedId },
    { projection: { fullName: 1, employeeId: 1, passwordHash: 1 } }
  );

  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    employeeId: doc.employeeId,
    passwordHash: doc.passwordHash
  };
};

export const findEmployeeById = async (employeeId) => {
  const employees = getCollection('employees');
  const objectId = toObjectId(employeeId);
  if (!objectId) {
    return null;
  }

  const doc = await employees.findOne(
    { _id: objectId },
    { projection: { fullName: 1, employeeId: 1 } }
  );

  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    employeeId: doc.employeeId
  };
};

export const updatePaymentStatus = async ({ paymentId, status }) => {
  const payments = getCollection('payments');
  const objectId = toObjectId(paymentId);
  if (!objectId) {
    return { modifiedCount: 0 };
  }

  const result = await payments.updateOne(
    { _id: objectId },
    { $set: { status, updatedAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount };
};

export const closeDatabase = async () => {
  if (!client) {
    return;
  }

  await client.close();
  client = null;
  database = null;
};
