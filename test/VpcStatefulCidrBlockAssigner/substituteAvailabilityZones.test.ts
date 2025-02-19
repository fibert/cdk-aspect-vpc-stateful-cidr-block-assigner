import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import * as errors from '../../src/errors';
import { VpcStatefulCidrBlockAssigner, SubnetRecord } from '../../src/vpcStatefulCidrBlockAssigner';
import * as constants from '../constants';

// CDK Stack
interface TestStackProps extends cdk.StackProps {
  cidrBlock: string;
  availabilityZones: Array<string>;
  subnetConfiguration: Array<ec2.SubnetConfiguration>;
}

class TestStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  constructor(scope: Construct, id: string, props: TestStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
      availabilityZones: props.availabilityZones,
      subnetConfiguration: props.subnetConfiguration,
    });
  }
}

const APP = new cdk.App();
const STACK = new TestStack(APP, 'IntegrationTestStack', {
  env: constants.ENV,
  cidrBlock: constants.VPC_CIDR_BLOCK,
  availabilityZones: constants.AVAILABILITY_ZONES_A_B,
  subnetConfiguration: constants.SUBNET_CONFIGURATION,
});

const BASE_TEMPLATE = Template.fromStack(STACK);
const BASE_SUBNETS = BASE_TEMPLATE.findResources('AWS::EC2::Subnet');
const BASE_SUBNET_RECORDS = generateSubnetRecordsArray(BASE_SUBNETS);

describe('test substituting availability zones', () => {
  test('without availabilityZoneSubstitutions expecting CIDR conflict', () => {
    // Given

    // When
    const testApp = new cdk.App();
    const testStack = new TestStack(testApp, 'substituteAzStack', {
      env: constants.ENV,
      cidrBlock: constants.VPC_CIDR_BLOCK,
      availabilityZones: constants.AVAILABILITY_ZONES_A_C,
      subnetConfiguration: constants.SUBNET_CONFIGURATION,
    });
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: constants.CONTEXT_FILE_VPC_ID,
      contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
    });
    cdk.Aspects.of(testStack.vpc).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    const testSubnetRecords = getSubnetRecordsFromStack(testStack);
    const conflictingSubnetRecords = calculateConfilictingSubnets(BASE_SUBNET_RECORDS, testSubnetRecords);

    expect(conflictingSubnetRecords).not.toEqual([]);
  });

  test('with availabilityZoneSubstitutions should have no CIDR conflicts', () => {
    // Given
    const substitutedBaseSubnetRecords: SubnetRecord[] = BASE_SUBNET_RECORDS.map((subnetRecord) => {
      for (const azSubstitution of constants.AZ_SUBSTITUTION_B_C) {
        if (subnetRecord.AvailabilityZone === azSubstitution.source) {
          return { ...subnetRecord, AvailabilityZone: azSubstitution.target };
        }
      }
      return subnetRecord;
    });

    // When
    const testApp = new cdk.App();
    const testStack = new TestStack(testApp, 'substituteAzStack', {
      env: constants.ENV,
      cidrBlock: constants.VPC_CIDR_BLOCK,
      availabilityZones: constants.AVAILABILITY_ZONES_A_C,
      subnetConfiguration: constants.SUBNET_CONFIGURATION,
    });
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: constants.CONTEXT_FILE_VPC_ID,
      contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      availabilityZoneSubstitutions: constants.AZ_SUBSTITUTION_B_C,
    });
    cdk.Aspects.of(testStack.vpc).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    const testSubnetRecords = getSubnetRecordsFromStack(testStack);
    const conflictingSubnetRecords = calculateConfilictingSubnets(
      substitutedBaseSubnetRecords,
      testSubnetRecords
    );

    expect(conflictingSubnetRecords).toStrictEqual([]);
  });

  test('with an AZ in both VPC and availabilityZoneSubstitutions should throw error', () => {
    // Given

    // When
    const testApp = new cdk.App();
    const testStack = new TestStack(testApp, 'substituteAzStack', {
      env: constants.ENV,
      cidrBlock: constants.VPC_CIDR_BLOCK,
      availabilityZones: constants.AVAILABILITY_ZONES_A_B_C,
      subnetConfiguration: constants.SUBNET_CONFIGURATION,
    });
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: constants.CONTEXT_FILE_VPC_ID,
      contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      availabilityZoneSubstitutions: constants.AZ_SUBSTITUTION_B_C,
    });
    cdk.Aspects.of(testStack.vpc).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    expect(() => {
      Template.fromStack(testStack);
    }).toThrow(errors.AZ_IN_BOTH_VPC_AND_SUBSTITUTION);
  });
});

function getSubnetRecordsFromStack(stack: cdk.Stack): SubnetRecord[] {
  const template = Template.fromStack(stack);
  const subnets = template.findResources('AWS::EC2::Subnet');
  return generateSubnetRecordsArray(subnets);
}

function calculateConfilictingSubnets(first: SubnetRecord[], second: SubnetRecord[]): SubnetRecord[] {
  return first.filter((firstSubnetRecord) => {
    for (const secondSubnetRecord of second) {
      if (isConflicting(firstSubnetRecord, secondSubnetRecord)) {
        return true;
      }
    }
    return false;
  });
}

function isConflicting(first: SubnetRecord, second: SubnetRecord): boolean {
  return (
    first.CidrBlock === second.CidrBlock &&
    !(first.AvailabilityZone === second.AvailabilityZone && first.Name === first.Name)
  );
}

function generateSubnetRecordsArray(subnets: {
  [key: string]: {
    [key: string]: any;
  };
}): SubnetRecord[] {
  return Object.values(subnets).map((subnet) => {
    const name = subnet.Properties.Tags.filter(
      (tag: { Key: string; Value: string }) => tag.Key === 'aws-cdk:subnet-name'
    )[0].Value;

    return {
      Name: name,
      AvailabilityZone: subnet.Properties.AvailabilityZone,
      CidrBlock: subnet.Properties.CidrBlock,
    } as SubnetRecord;
  });
}
