import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { VpcStatefulCidrBlockAssigner } from './vpcStatefulCidrBlockAssigner';

interface IIntegTestingProps {
  cidrBlock: string;
  availabilityZones: Array<string>;
  subnetConfiguration: Array<ec2.SubnetConfiguration>;
}

export class IntegTesting {
  readonly stack: cdk.Stack;
  readonly app: cdk.App;

  constructor(props: IIntegTestingProps) {

    const ENV: cdk.Environment = { account: '027179758433', region: 'us-east-1' };
    this.app = new cdk.App();
    this.stack = new cdk.Stack(this.app, 'demo', { env: ENV });

    const vpc = new ec2.Vpc(this.stack, 'TestVpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
      availabilityZones: props.availabilityZones,
      subnetConfiguration: props.subnetConfiguration,
    });

    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: 'vpc-01b37083041d6f6c5',
      // availabilityZoneSubstitutions: [{source: 'us-east-1b', target: 'us-east-1c'}],
    });
    cdk.Aspects.of(vpc).add(vpcStatefulCidrBlockAssigner, {priority: cdk.AspectPriority.MUTATING});
  }
}

const CIDR_BLOCK = '10.10.0.0/16';
const AVAILABILITY_ZONES: Array<string> = ['us-east-1a','us-east-1c'];
const SUBNET_CONFIGURATION: Array<ec2.SubnetConfiguration> = [
  { name: 'proxies', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC },
  { name: 'backend', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  { name: 'database', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
];

const integ = new IntegTesting({ 
  cidrBlock: CIDR_BLOCK, 
  availabilityZones: AVAILABILITY_ZONES, 
  subnetConfiguration: SUBNET_CONFIGURATION 
});
integ.app.synth();
