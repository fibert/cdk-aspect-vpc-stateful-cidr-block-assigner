Considerations
* Consider migrating to VPCv2
* Use this only if you must
* Apply aspect to a construct containing up to one VPC. Applying to a construct with more than one VPC will return a descriptive error
* VPC construct and provided VPC ID must match. A miss-match between the two would exit with a descriptive error
* VPC construct must use `availabilityZones: ['us-east-1a', 'us-east-1b']` and not maxAzs. 
* Only supports IPv4
* One CIDR block per VPC
* Only homogeneus CIDR block sizes for subnets
* push `${VPC_ID}.subnets.context.json` to git

* Logical IDs must not change
* Can only add and delete right most AZ
* Can substitute AZ in any position

```bash
export VPC_ID=vpc-01b37083041d6f6c5
aws ec2 describe-subnets --filters Name=vpc-id,Values=${VPC_ID} --query "Subnets[*].{Name: Tags[?Key == 'aws-cdk:subnet-name'] | [0].Value, LogicalId: Tags[?Key == 'aws:cloudformation:logical-id'] | [0].Value, AvailabilityZone: AvailabilityZone, CidrBlock: CidrBlock}" > ${VPC_ID}.subnets.context.json
```




# Usage

```bash
export VPC_ID="{VPC ID}"
aws ec2 describe-subnets --filters Name=vpc-id,Values=${VPC_ID} --query "Subnets[*].{Name: Tags[?Key == 'aws-cdk:subnet-name'] | [0].Value, LogicalId: Tags[?Key == 'aws:cloudformation:logical-id'] | [0].Value, AvailabilityZone: AvailabilityZone, CidrBlock: CidrBlock}" > ${VPC_ID}.subnets.context.json
```

```typescript
const network = Network(...) // Contains exactly one VPC construct

const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({vpcId: 'vpc-01234567890abcdef'});
cdk.Aspects.of(vpc).add(vpcStatefulCidrBlockAssigner, {priority: cdk.AspectPriority.MUTATING});
```

# TO TEST
* Add subnet, same AZs
* Add AZ, same subnets
* Delete AZ, same subnets
* Delete Subnet, same AZs
* Replace Subnet name
* Replace AZ in-place