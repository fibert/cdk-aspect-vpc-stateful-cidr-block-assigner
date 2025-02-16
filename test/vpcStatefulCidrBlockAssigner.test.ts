import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IntegTesting } from '../src/integ.default';
import { VpcStatefulCidrBlockAssigner, SubnetRecord } from '../src/vpcStatefulCidrBlockAssigner';

const CIDR_BLOCK = '10.10.0.0/16';
const AVAILABILITY_ZONES_A_B = ['us-east-1a', 'us-east-1b'];
const AVAILABILITY_ZONES_A_B_C = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
const VPC_ID = 'test';
const CONTEXT_FILE_DIRECTORY = 'test/';
const SUBNET_PREFIX = 24;
const SUBNET_CONFIGURATION: Array<ec2.SubnetConfiguration> = [
  {
    name: 'public',
    cidrMask: SUBNET_PREFIX,
    subnetType: ec2.SubnetType.PUBLIC,
  },
  {
    name: 'private',
    cidrMask: SUBNET_PREFIX,
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
];

const INTEG_TESTING = new IntegTesting({
  cidrBlock: CIDR_BLOCK,
  availabilityZones: AVAILABILITY_ZONES_A_B,
  subnetConfiguration: SUBNET_CONFIGURATION,
});

const BASE_TEMPLATE = Template.fromStack(INTEG_TESTING.stack);

describe('append availability zone', () => {
  test('without VpcStatefulCidrBlockAssigner expecting CIDR conflict', () => {
    // Given
    const baseSubnets = BASE_TEMPLATE.findResources('AWS::EC2::Subnet');
    const baseSubnetRecords = generateSubnetRecordsArray(baseSubnets);

    // When
    const addAzIntegTesting = new IntegTesting({
      cidrBlock: CIDR_BLOCK,
      availabilityZones: AVAILABILITY_ZONES_A_B_C,
      subnetConfiguration: SUBNET_CONFIGURATION,
    });

    // Then
    const testTemplate = Template.fromStack(addAzIntegTesting.stack);
    const testSubnets = testTemplate.findResources('AWS::EC2::Subnet');
    const testSubnetRecords = generateSubnetRecordsArray(testSubnets);

    const conflictingSubnetRecords = calculateConfilictingSubnets(baseSubnetRecords, testSubnetRecords);

    expect(conflictingSubnetRecords).not.toEqual([]);
  });

  test('with VpcStatefulCidrBlockAssigner should have no CIDR conflicts', () => {
    // Given
    const baseSubnets = BASE_TEMPLATE.findResources('AWS::EC2::Subnet');
    const baseSubnetRecords = generateSubnetRecordsArray(baseSubnets);

    // When
    const addAzIntegTesting = new IntegTesting({
      cidrBlock: CIDR_BLOCK,
      availabilityZones: AVAILABILITY_ZONES_A_B_C,
      subnetConfiguration: SUBNET_CONFIGURATION,
    });
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: VPC_ID,
      contextFileDirectory: CONTEXT_FILE_DIRECTORY,
    });
    cdk.Aspects.of(addAzIntegTesting.vpc).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    const testTemplate = Template.fromStack(addAzIntegTesting.stack);
    const testSubnets = testTemplate.findResources('AWS::EC2::Subnet');
    const testSubnetRecords = generateSubnetRecordsArray(testSubnets);

    const conflictingSubnetRecords = calculateConfilictingSubnets(baseSubnetRecords, testSubnetRecords);

    expect(conflictingSubnetRecords).toStrictEqual([]);
  });
});

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
      (tag: { Key: string; Value: string }) => tag.Key === 'aws-cdk:subnet-name',
    )[0].Value;

    return {
      Name: name,
      AvailabilityZone: subnet.Properties.AvailabilityZone,
      CidrBlock: subnet.Properties.CidrBlock,
    } as SubnetRecord;
  });
}
