import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import * as errors from '../../src/errors';
import { VpcStatefulCidrBlockAssigner, SubnetRecord } from '../../src/vpcStatefulCidrBlockAssigner';
import * as constants from '../constants';
import { SubnetUtils } from './subnetUtils';

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
let baseApp: cdk.App;
let baseStack: TestStack;
let baseTemplate: Template;
let baseSubnets: { [key: string]: { [key: string]: any } };
let baseSubnetRecords: Array<SubnetRecord>;
let baseSubstitutedSubnetRecords: Array<SubnetRecord>;

beforeAll(() => {
  baseApp = new cdk.App();
  baseStack = new TestStack(baseApp, 'Stack', {
    env: constants.ENV,
    cidrBlock: constants.VPC_CIDR_BLOCK,
    availabilityZones: constants.AVAILABILITY_ZONES_A_B,
    subnetConfiguration: constants.SUBNET_CONFIGURATION,
  });

  baseTemplate = Template.fromStack(baseStack);
  baseSubnets = baseTemplate.findResources('AWS::EC2::Subnet');
  baseSubnetRecords = SubnetUtils.generateSubnetRecordsArray(baseSubnets);

  baseSubstitutedSubnetRecords = baseSubnetRecords.map((subnetRecord) => {
    for (const azSubstitution of constants.AZ_SUBSTITUTION_B_C) {
      if (subnetRecord.AvailabilityZone === azSubstitution.source) {
        return { ...subnetRecord, AvailabilityZone: azSubstitution.target };
      }
    }
    return subnetRecord;
  });
});

let testApp: cdk.App;
let testStack: TestStack;

beforeEach(() => {
  testApp = new cdk.App();
  testStack = new TestStack(testApp, 'Stack', {
    env: constants.ENV,
    cidrBlock: constants.VPC_CIDR_BLOCK,
    availabilityZones: constants.AVAILABILITY_ZONES_A_C, // Replace AZ B with C
    subnetConfiguration: constants.SUBNET_CONFIGURATION,
  });
});

describe('test substituting availability zones', () => {
  test('without availabilityZoneSubstitutions expecting CIDR conflict', () => {
    // Given

    // When
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: constants.CONTEXT_FILE_VPC_ID,
      contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
    });
    cdk.Aspects.of(testStack.vpc).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    const testSubnetRecords = SubnetUtils.getSubnetRecordsFromStack(testStack);
    const conflictingSubnetRecords = SubnetUtils.calculateConfilictingSubnets(
      baseSubnetRecords,
      testSubnetRecords,
    );

    expect(conflictingSubnetRecords).not.toEqual([]);
  });

  test('with availabilityZoneSubstitutions should have no CIDR conflicts', () => {
    // Given

    // When
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: constants.CONTEXT_FILE_VPC_ID,
      contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      availabilityZoneSubstitutions: constants.AZ_SUBSTITUTION_B_C,
    });
    cdk.Aspects.of(testStack.vpc).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    const testSubnetRecords = SubnetUtils.getSubnetRecordsFromStack(testStack);
    const conflictingSubnetRecords = SubnetUtils.calculateConfilictingSubnets(
      baseSubstitutedSubnetRecords,
      testSubnetRecords,
    );

    expect(conflictingSubnetRecords).toStrictEqual([]);
  });

  test('with an AZ in both VPC and availabilityZoneSubstitutions should throw error', () => {
    // Given
    testStack = new TestStack(testApp, 'substituteAzStack', {
      env: constants.ENV,
      cidrBlock: constants.VPC_CIDR_BLOCK,
      availabilityZones: constants.AVAILABILITY_ZONES_A_B_C,
      subnetConfiguration: constants.SUBNET_CONFIGURATION,
    });

    // When
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
