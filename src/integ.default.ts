import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { VpcStatefulCidrBlockAssigner } from './vpcStatefulCidrBlockAssigner';

interface IntegTestingProps {
  cidrBlock: string;
  availabilityZones: Array<string>;
  subnetConfiguration: Array<ec2.SubnetConfiguration>;
}

export class IntegTesting {
  readonly stack: cdk.Stack;
  readonly app: cdk.App;
  readonly vpc: ec2.Vpc;

  constructor(props: IntegTestingProps) {

    const ENV: cdk.Environment = { account: '027179758433', region: 'us-east-1' };
    this.app = new cdk.App();
    this.stack = new cdk.Stack(this.app, 'IntegrationTestStack', { env: ENV });

    this.vpc = new ec2.Vpc(this.stack, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
      availabilityZones: props.availabilityZones,
      subnetConfiguration: props.subnetConfiguration,
    });
  }
}

const CIDR_BLOCK = '10.10.0.0/16';
const AVAILABILITY_ZONES: Array<string> = ['us-east-1a', 'us-east-1b'];
const SUBNET_CONFIGURATION: Array<ec2.SubnetConfiguration> = [
  { name: 'proxies', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC },
  { name: 'backend', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  { name: 'database', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
];

const integ = new IntegTesting({
  cidrBlock: CIDR_BLOCK,
  availabilityZones: AVAILABILITY_ZONES,
  subnetConfiguration: SUBNET_CONFIGURATION,
});


const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
  vpcId: 'vpc-01b37083041d6f6c5',
  // availabilityZoneSubstitutions: [{source: 'us-east-1b', target: 'us-east-1c'}],
});
cdk.Aspects.of(integ.vpc).add(vpcStatefulCidrBlockAssigner, { priority: cdk.AspectPriority.MUTATING });

integ.app.synth();
