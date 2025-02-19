import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import * as constants from './constants';
import { SubnetManager } from '../src/subnetManager';

describe('test SubnetManager', () => {
  test('when setting a new CIDR block to subnet', () => {
    // Given
    const testApp = new cdk.App();
    const testStack = new cdk.Stack(testApp, 'Stack');
    const testVpc = new ec2.Vpc(testStack, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(constants.VPC_CIDR_BLOCK),
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: constants.SUBNET_PREFIX,
        },
      ],
    });

    // When
    const testSubnet = testVpc.publicSubnets[0] as ec2.Subnet;
    SubnetManager.setSubnetCidrBlock(testSubnet, constants.SUBNET_CIDR_BLOCK_2);

    // Then
    const template = Template.fromStack(testStack);

    const cidrBlockCapture = new Capture();
    template.hasResourceProperties('AWS::EC2::Subnet', {
      CidrBlock: cidrBlockCapture,
    });
    const cidrBlock = cidrBlockCapture.asString();

    expect(cidrBlock).toBe(constants.SUBNET_CIDR_BLOCK_2);
  });
});
