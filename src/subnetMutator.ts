import { aws_ec2 as ec2 } from 'aws-cdk-lib';

/**
 * Utility class for modifying ec2.Subnet configurations
 */
export class SubnetMutator {
  /**
   * Updates the CIDR block of an existing subnet
   * @param subnet The EC2 subnet to modify
   * @param newCidrBlock The new CIDR block to assign to the subnet
   */
  public static setSubnetCidrBlock(subnet: ec2.Subnet, newCidrBlock: string): void {
    const l1Subnet = subnet.node.defaultChild as ec2.CfnSubnet;
    l1Subnet.addPropertyOverride('CidrBlock', newCidrBlock);
  }
}
