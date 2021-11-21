
const VotableERC20 = artifacts.require("VotableERC20")
const Box = artifacts.require("Box")
const BoxGovernor = artifacts.require("BoxGovernor")
const BoxTimeLock = artifacts.require("BoxTimeLock")
const path = require("path");
const expect = require("./setupTest")
const {time} = require("@openzeppelin/test-helpers")
const dotenv = require('dotenv');
const { duration } = require("@openzeppelin/test-helpers/src/time");
result = dotenv.config({ path: "./.env" });

if (result.error) {
    console.log("Fail to load .env varilable: test.MyToken.test.js")
    throw result.error
}

contract ("My contract test", ([alice, bob, care, dev, eric, frank, gary, harry, iris, jerry, kevin, lora, money, noah, olivia])=>{
    beforeEach(async ()=>{
        this.startLine = (content)=>{
            console.log(`\n------------ ${content} ------------`)
        }
        this.finishLine = (content) => {
            console.log(`============ ${content} ============\n`)
        }
        this.printTestContent = async (content) => {
            console.log(`  * ${content}`) 
        }
        this.beforeAndAfter = (title ,before, after) =>{
            this.printTestContent(`${title}: ${before} --> ${after} dif: (${after - before})`)
        }
    })

    it("Should deploy voteableERC20 and work functionally", async () => {
        this.token = await VotableERC20.new()
        await this.token.transfer(bob, web3.utils.toWei("200"), {from: alice})
        await this.token.transfer(care, web3.utils.toWei("300"), {from: alice})
        await this.token.delegate(alice, {from: alice})
        await this.token.delegate(bob, {from:bob})
        await this.token.delegate(care, {from: care})

        /**
         * @annotation
         * checkpoint represent the users voting power over time.
         * In this case alice, bob and care get their first voting power by delegating to themself
         * 3 of them will get 1 check point.
         */        
        this.printTestContent(`Owner's check points: ${await this.token.numCheckpoints(alice)}`)
        this.printTestContent(`Bob's check points: ${await this.token.numCheckpoints(bob)}`)
        this.printTestContent(`Care's check points: ${await this.token.numCheckpoints(care)}`)

        /**
         * @annotation
         * voting value can be checked by looking into each checkpoint
         * @dev
         * getVote method to see current votes balance for `account`
         */
        this.printTestContent(`Owner's voting power: ${await this.token.getVotes(alice)/1e18}`)
        this.printTestContent(`Bob's voting power: ${await this.token.getVotes(bob)/1e18}`)
        this.printTestContent(`Care's voting power: ${await this.token.getVotes(care)/1e18}`)

        this.finishLine("FIRST DELEGATE")
        /**
         * @annotation
         * The after care transfer his token to eric, it means the voting power of care will become two
         * 1. the voting power before transfer (The proposal created before transfering time, care can have higher voting power)
         * 2. the voting power after transfer (The proposal created after transfering time, care hs lowerver voting power)
         * Then eric also get his first check point
         * @reference official openzeppelin contract:
         * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Votes.sol
         */
        await this.token.transfer(eric, web3.utils.toWei("100"), {from: care})  
        await this.token.delegate(eric, {from: eric})
        this.printTestContent(`Owner's check points: ${await this.token.numCheckpoints(alice)}`)
        this.printTestContent(`Bob's check points: ${await this.token.numCheckpoints(bob)}`)
        this.printTestContent(`Care's check points: ${await this.token.numCheckpoints(care)}`)
        this.printTestContent(`Eric's check points: ${await this.token.numCheckpoints(eric)}`)

        /**
         * @dev 
         * We can use checkpoints method to check specific check point voting power
         * official document: the `pos`-th checkpoint for `account`.
         */

        this.printTestContent(`Care's check points before transfer: ${(await this.token.checkpoints(care, 0))[1]/1e18}`)
        this.printTestContent(`Care's check points before transfer: ${(await this.token.checkpoints(care, 1))[1]/1e18}`)

        /**
         * @dev
         * We can also get the voting power by using getPastVotes to get the the certain user's vote power 
         * at certain blockNumber
         */

        this.finishLine("SECOND DELEGATE")
    })
    it("Delopy BoxTimeLock contract", async () => {
        this.startLine("DEPLOY BoxTimeLock")
        this.locker = await BoxTimeLock.new(
            24 * 60 * 60,   // Delay time: 24 Hours in second
            [],             // Proposor
            [],             // Exectutor
        )
        this.finishLine(`BoxTimeLock addr: ${this.locker.address}`)
    })
    it("Deploy BoxGovernor contract", async () => {
        this.startLine("DEPLOY BoxGovernor")
        this.governor = await BoxGovernor.new(
            this.token.address,         // Governor token address
            this.locker.address,        // TimeLocker address
            4,                          // QUORUM_PERCENTAGE
            20,                          // Voting period: 20 blocks
            10,                          // Voting delay: 10 block
        )
        this.finishLine(`Governor contract addr: ${this.governor.address}`)
    })
    it("Set the role", async () => {
        this.startLine("Set Locker rule")
        let proposerRole = await this.locker.PROPOSER_ROLE()
        let executeRole = await this.locker.EXECUTOR_ROLE()
        let adminRole = await this.locker.TIMELOCK_ADMIN_ROLE()

        //  Set governor as proposal role
        await this.locker.grantRole(proposerRole, this.governor.address)
        this.printTestContent(`Governor has proposer role: ${await this.locker.hasRole(proposerRole, this.governor.address)}`)

        // Set everybody can be execute role
        await this.locker.grantRole(executeRole, "0x0000000000000000000000000000000000000000")
        this.printTestContent(`Anyone has execute role: ${await this.locker.hasRole(executeRole, this.governor.address)}`)

        // Remove deployer from admin role
        await this.locker.revokeRole(adminRole, alice)
        this.printTestContent(`Deployer no longer has admin role: ${!await this.locker.hasRole(adminRole, alice)}`)
        this.finishLine("")
    })
    it("Deploy Box contract", async () => {
        this.startLine("DEPLOY Box contract")
        this.box = await Box.new()
        await this.box.transferOwnership(this.locker.address)
        this.finishLine(`Box contract addr: ${this.box.address}`)
    })

    it("Propose", async () => {
        this.startLine("START PROPOSING")
        let beforeProposeBlock = await web3.eth.getBlockNumber()
        this.printTestContent(`Current block#: ${beforeProposeBlock}`)
        this.encodedCalldatas = web3.eth.abi.encodeFunctionCall({
            name: "store",
            type: "function",
            inputs: [
                {
                    type: "uint256",
                    name: "newValue"
                }
            ]
        }, ["5"])
        let tx = await this.governor.propose(
            [this.box.address],                 // address[] memory targets,
            [0],                                // uint256[] memory values,       
            [this.encodedCalldatas],            // bytes[] memory calldatas,
            "Proposal #1: Store 5 in the Box!"  //string memory description
        )
        this.id = tx.logs[0].args.proposalId

        /**
         * @PrposalState
         * 0: Pending,
         * 1: Active,
         * 2: Canceled,
         * 3: Defeated,
         * 4: Succeeded,
         * 5: Queued,
         * 6: Expired,
         * 7: Executed
         */
        
        let state = await this.governor.state(this.id) 
        this.printTestContent(`Proposal Id: ${this.id}`)
        this.printTestContent(`Proposal state: ${state}`)
        await time.advanceBlockTo(beforeProposeBlock + 11)
        this.printTestContent(`Snapshot (blocknumber after delay): ${await this.governor.proposalSnapshot(this.id)}`)
        this.printTestContent(`Proposal deadline: ${await this.governor.proposalDeadline(this.id)}`)
        this.finishLine("")
    })

    it("Vote", async () => {
        this.startLine("VOTING")
        await this.governor.castVoteWithReason(
            this.id,    // proposal Id
            1,          // 0 = Against, 1 = For, 2 = Abstain for this example
            "Cuz I love this project", 
        )
        this.printTestContent(`Current Block#: ${await web3.eth.getBlockNumber()}`)
        this.printTestContent(`Proposal state right after vote: ${await this.governor.state(this.id)}`)
        await time.advanceBlockTo(await web3.eth.getBlockNumber() + 20)
        this.printTestContent(`Proposal state after vote finish: ${await this.governor.state(this.id)}`)
        this.finishLine("")
    })
    it("Queue the proposal to the timelock", async () => {
        this.startLine("START QUEUEING PROPOSAL")
        /**
         * @Dev queue method is under GovernorTimelockControl.sol
         * @openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol
         */
        await this.governor.queue(
            [this.box.address],                                         //address[] memory targets,
            [0],                                                        //uint256[] memory values,
            [this.encodedCalldatas],                                    //bytes[] memory calldatas,
            web3.utils.keccak256("Proposal #1: Store 5 in the Box!")    //bytes32 descriptionHash            
        )
        this.printTestContent(`After queue, Proposal state changes to --> ${await this.governor.state(this.id)}`) 
        this.finishLine("")       
    })

    it("Execute the proposal", async () => {
        this.startLine("START ECECUTING PROPOSAL")
        let boxValue = await this.box.retrieve()

        time.increase(duration.hours(25))

        await this.governor.execute(
            [this.box.address],                                         // address[] memory targets,
            [0],                                                        // uint256[] memory values,
            [this.encodedCalldatas],                                    // bytes[] memory calldatas,
            web3.utils.keccak256("Proposal #1: Store 5 in the Box!"),   // bytes32 descriptionHash
        )
        this.printTestContent(`After execute, Proposal state changes to --> ${await this.governor.state(this.id)}`)
        this.beforeAndAfter(`Value in BOX chaning from `, boxValue, await this.box.retrieve())
        this.finishLine("")
    })
    
})