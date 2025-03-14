import * as integ from '@aws-cdk/integ-tests-alpha';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
// import { VpcStatefulCidrBlockAssigner } from '../src/vpcStatefulCidrBlockAssigner';

const CIDR_BLOCK = '10.10.0.0/16';
const AVAILABILITY_ZONES: Array<string> = ['us-east-1a', 'us-east-1b'];
const SUBNET_CONFIGURATION: Array<ec2.SubnetConfiguration> = [
  { name: 'proxies', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC },
  { name: 'backend', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  { name: 'database', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
];

const app = new cdk.App();
const stack = new cdk.Stack(app, 'IntegrationTestStack');
new ec2.Vpc(stack, 'Vpc', {
  ipAddresses: ec2.IpAddresses.cidr(CIDR_BLOCK),
  availabilityZones: AVAILABILITY_ZONES,
  subnetConfiguration: SUBNET_CONFIGURATION,
});

new integ.IntegTest(app, 'VpcStatefulCidrBlockAssignerTest', {
  testCases: [stack],
});


// const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
//   vpcId: 'vpc-013b3e4e2cff61b31',
//   // availabilityZoneSubstitutions: [{source: 'us-east-1b', target: 'us-east-1c'}],
// });
// cdk.Aspects.of(integ.vpc).add(vpcStatefulCidrBlockAssigner, { priority: cdk.AspectPriority.MUTATING });

// integ.app.synth();
