import * as fs from 'fs';
import * as path from 'path';
import * as errors from '../src/errors';
import { SubnetsContextFileParser } from '../src/subnetContextFileParser';

describe('SubnetsContextFileParser', () => {
  const TEST_VPC_ID = 'vpc-012345678912';
  const TEST_CONTEXT_DIRECTORY_PATH = path.join(process.cwd(), 'test-context-dir');
  const FILE_PATH = path.join(process.cwd(), `${TEST_VPC_ID}.subnets.context.json`);
  const VALID_SUBNET_RECORDS = `[
    {
      "Name": "public",
      "AvailabilityZone": "us-east-1a",
      "CidrBlock": "10.100.1.0/24"
    },
    {
      "Name": "private",
      "AvailabilityZone": "us-east-1a",
      "CidrBlock": "10.100.2.0/24"
    }
  ]`;

  beforeEach(() => {
    if (fs.existsSync(FILE_PATH)) {
      fs.unlinkSync(FILE_PATH);
    }

    if (fs.existsSync(TEST_CONTEXT_DIRECTORY_PATH)) {
      fs.rmSync(TEST_CONTEXT_DIRECTORY_PATH, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(FILE_PATH)) {
      fs.unlinkSync(FILE_PATH);
    }

    if (fs.existsSync(TEST_CONTEXT_DIRECTORY_PATH)) {
      fs.rmSync(TEST_CONTEXT_DIRECTORY_PATH, { recursive: true, force: true });
    }
  });

  test('should successfully parse a valid subnet context file in current directory', () => {
    // Given
    fs.writeFileSync(FILE_PATH, VALID_SUBNET_RECORDS);

    // When
    const result = SubnetsContextFileParser.parse(TEST_VPC_ID);

    // Then
    expect(result).toHaveLength(2);
  });

  test('should successfully parse a valid subnet context file in a specified directory', () => {
    // Given
    const fileInDirPath = path.join(TEST_CONTEXT_DIRECTORY_PATH, `${TEST_VPC_ID}.subnets.context.json`);
    fs.mkdirSync(TEST_CONTEXT_DIRECTORY_PATH);
    fs.writeFileSync(fileInDirPath, VALID_SUBNET_RECORDS);

    // When
    const result = SubnetsContextFileParser.parse(TEST_VPC_ID, TEST_CONTEXT_DIRECTORY_PATH);

    // Then
    expect(result).toHaveLength(2);
  });

  test('should throw when context file does not exist', () => {
    // Given/When/Then
    expect(() => {
      SubnetsContextFileParser.parse('non-existent-vpc');
    }).toThrow(errors.SUBNET_CONTEXT_FILE_DOES_NOT_EXIST);
  });

  test('should throw when context file is empty', () => {
    // Given
    fs.writeFileSync(FILE_PATH, '');

    // When/Then
    expect(() => {
      SubnetsContextFileParser.parse(TEST_VPC_ID);
    }).toThrow(errors.EMPTY_SUBNET_CONTEXT_FILE);
  });

  test('should throw when context file is invalid json', () => {
    // Given
    fs.writeFileSync(FILE_PATH, 'invalid json');

    // When/Then
    expect(() => {
      SubnetsContextFileParser.parse(TEST_VPC_ID);
    }).toThrow(errors.PARSING_SUBNET_CONTEXT_FILE);
  });

  test('should throw when context file is not a file', () => {
    // Given
    fs.mkdirSync(FILE_PATH);

    // When/Then
    expect(() => {
      SubnetsContextFileParser.parse(TEST_VPC_ID);
    }).toThrow(errors.READING_SUBNET_CONTEXT_FILE);

    // Teardown
    fs.rmSync(FILE_PATH, { recursive: true, force: true });
  });
});
