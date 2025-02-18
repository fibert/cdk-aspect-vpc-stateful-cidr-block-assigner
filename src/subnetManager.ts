import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export class SubnetManager {
  public static setSubnetCidrBlock(subnet: ec2.Subnet, newCidrBlock: string): void {
    const l1Subnet = subnet.node.defaultChild as ec2.CfnSubnet;
    l1Subnet.addPropertyOverride('CidrBlock', newCidrBlock);
  }
}
