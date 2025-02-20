import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
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

let baseApp: cdk.App;
let baseStack: TestStack;
let baseTemplate: Template;
let baseSubnets: { [key: string]: { [key: string]: any } };
let baseSubnetRecords: Array<SubnetRecord>;

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
  baseSubnetRecords = generateSubnetRecordsArray(baseSubnets);
});

let testApp: cdk.App;
let testStack: TestStack;

beforeEach(() => {
  testApp = new cdk.App();
  testStack = new TestStack(testApp, 'Stack', {
    env: constants.ENV,
    cidrBlock: constants.VPC_CIDR_BLOCK,
    availabilityZones: constants.AVAILABILITY_ZONES_A_B_C, // Add AZ C
    subnetConfiguration: constants.SUBNET_CONFIGURATION,
  });
});

describe('test appending availability zone', () => {
  test('without VpcStatefulCidrBlockAssigner expecting CIDR conflict', () => {
    // Given

    // When

    // Then
    const testSubnetRecords = getSubnetRecordsFromStack(testStack);
    const conflictingSubnetRecords = calculateConfilictingSubnets(baseSubnetRecords, testSubnetRecords);

    expect(conflictingSubnetRecords).not.toEqual([]);
  });

  test('with VpcStatefulCidrBlockAssigner should have no CIDR conflicts', () => {
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
    const testSubnetRecords = getSubnetRecordsFromStack(testStack);
    const conflictingSubnetRecords = calculateConfilictingSubnets(baseSubnetRecords, testSubnetRecords);

    expect(conflictingSubnetRecords).toStrictEqual([]);
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
      (tag: { Key: string; Value: string }) => tag.Key === 'aws-cdk:subnet-name',
    )[0].Value;

    return {
      Name: name,
      AvailabilityZone: subnet.Properties.AvailabilityZone,
      CidrBlock: subnet.Properties.CidrBlock,
    } as SubnetRecord;
  });
}
