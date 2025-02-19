import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import * as constants from './constants';
import { SubnetCidrBlockMatcher } from '../src/subnetCidrBlockMatcher';

let testApp: cdk.App;
let testStack: cdk.Stack;
let testVpc: ec2.Vpc;
let testSubnet1: ec2.Subnet;
let testSubnet2: ec2.Subnet;
let subnetCidrBlockMatcher: SubnetCidrBlockMatcher;

beforeEach(() => {
  testApp = new cdk.App();
  testStack = new cdk.Stack(testApp, 'Stack');
  testVpc = new ec2.Vpc(testStack, 'Vpc', {
    ipAddresses: ec2.IpAddresses.cidr(constants.VPC_CIDR_BLOCK),
    maxAzs: 2,
    subnetConfiguration: [
      {
        name: 'public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: constants.SUBNET_PREFIX,
      },
    ],
  });
  testSubnet1 = testVpc.publicSubnets[0] as ec2.Subnet;
  testSubnet2 = testVpc.publicSubnets[1] as ec2.Subnet;

  subnetCidrBlockMatcher = new SubnetCidrBlockMatcher();
});

describe('test SubnetCidrMatcher', () => {
  test('when first adding Cidrs and then Subnets', () => {
    // Given

    // When
    subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(constants.SUBNET_CIDR_BLOCK_1);
    subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(constants.SUBNET_CIDR_BLOCK_2);
    subnetCidrBlockMatcher.matchSubnetWithCidrBlock(testSubnet1);
    subnetCidrBlockMatcher.matchSubnetWithCidrBlock(testSubnet2);

    // Then
    const expected = extractCidrBlocksFromStack(testStack).sort();
    const received = [constants.SUBNET_CIDR_BLOCK_1, constants.SUBNET_CIDR_BLOCK_2].sort();

    expect(expected).toMatchObject(received);
  });

  test('when first adding Subnets and then Cidrs', () => {
    // Given

    // When
    subnetCidrBlockMatcher.matchSubnetWithCidrBlock(testSubnet1);
    subnetCidrBlockMatcher.matchSubnetWithCidrBlock(testSubnet2);
    subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(constants.SUBNET_CIDR_BLOCK_1);
    subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(constants.SUBNET_CIDR_BLOCK_2);

    // Then
    const expected = extractCidrBlocksFromStack(testStack).sort();
    const received = [constants.SUBNET_CIDR_BLOCK_1, constants.SUBNET_CIDR_BLOCK_2].sort();

    expect(expected).toMatchObject(received);
  });
  test('when alternating Subnets and Cidrs', () => {
    // Given

    // When
    subnetCidrBlockMatcher.matchSubnetWithCidrBlock(testSubnet1);
    subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(constants.SUBNET_CIDR_BLOCK_1);
    subnetCidrBlockMatcher.matchSubnetWithCidrBlock(testSubnet2);
    subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(constants.SUBNET_CIDR_BLOCK_2);

    // Then
    const expected = extractCidrBlocksFromStack(testStack).sort();
    const received = [constants.SUBNET_CIDR_BLOCK_1, constants.SUBNET_CIDR_BLOCK_2].sort();

    expect(expected).toMatchObject(received);
  });
});

function extractCidrBlocksFromStack(stack: cdk.Stack): string[] {
  const template = Template.fromStack(stack);

  const cidrBlockCapture = new Capture();

  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: cidrBlockCapture,
  });

  const cidrBlock1 = cidrBlockCapture.asString();
  cidrBlockCapture.next();
  const cidrBlock2 = cidrBlockCapture.asString();

  return [cidrBlock1, cidrBlock2];
}
