import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { SubnetMutator } from './subnetMutator';

/**
 * A class that manages the matching of ec2.Subnets with CIDR blocks.
 * Maintains two queues - one for CIDR blocks waiting to be assigned to subnets,
 * and another for subnets waiting to be assigned CIDR blocks.
 */
export class SubnetCidrBlockMatcher {
  /** Queue of CIDR blocks waiting to be assigned to subnets */
  private freshCidrBlocksAwaitingSubnet: Array<string> = [];

  /** Queue of subnets waiting to be assigned CIDR blocks */
  private subnetsAwaitingFreshCidrBlock: Array<ec2.Subnet> = [];

  constructor() {}

  /**
   * Attempts to match a subnet with an available CIDR block.
   * If no CIDR block is available, adds the subnet to the waiting queue.
   * @param subnet The subnet to be matched with a CIDR block
   */
  matchSubnetWithCidrBlock(subnet: ec2.Subnet): void {
    const freshCidrBlock: string | undefined = this.freshCidrBlocksAwaitingSubnet.pop();

    if (freshCidrBlock === undefined) {
      this.subnetsAwaitingFreshCidrBlock.push(subnet);
    } else {
      SubnetMutator.setSubnetCidrBlock(subnet, freshCidrBlock);
    }
  }

  /**
   * Attempts to match a CIDR block with a waiting subnet.
   * If no subnet is waiting, adds the CIDR block to the waiting queue.
   * @param cidrBlock The CIDR block to be matched with a subnet
   */
  matchFreshCidrBlockWithSubnet(cidrBlock: string): void {
    const subnet: ec2.Subnet | undefined = this.subnetsAwaitingFreshCidrBlock.pop();

    if (subnet === undefined) {
      this.freshCidrBlocksAwaitingSubnet.push(cidrBlock);
    } else {
      SubnetMutator.setSubnetCidrBlock(subnet, cidrBlock);
    }
  }
}
