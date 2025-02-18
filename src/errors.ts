export const SUBNET_CONTEXT_FILE_DOES_NOT_EXIST = new Error('Subnet context file does not exist');
export const READING_SUBNET_CONTEXT_FILE = new Error('Error reading subnet context file');
export const EMPTY_SUBNET_CONTEXT_FILE = new Error('Subnet context file is empty');
export const PARSING_SUBNET_CONTEXT_FILE = new Error('Error parsing subnet context file');

export const MULTIPLE_VPCS = new Error('VpcStatefulCidrBlockAssigner can only be applied to a single VPC');
export const AZ_IN_BOTH_VPC_AND_SUBSTITUTION = new Error(
  'Availability Zones must only appear in one of: Availability Zone in VPC, or as a source of AvailabilityZoneSubstitutions',
);
