# The boilerplate of Governance DAO
## For Detailed implementation, See the blog below: 
[ColorfulLife Pages](https://colorfullife.ml/pages/diary/erics-daily-life/eric85/)

The boilerplate is created by following two main framware.
    - nodejs/ npm: JS framware
    - Truffle: EVM smart contract operation.    

# How to use

1. clone the repo:
```
git clone https://github.com/happyeric77/blockchain_governance_boilerplate.git
```

2. install npm depandencies:
```
npm install
```

3. create a .env file with your env vars:
```
# Required
PRIVATE_KEY=
# Optional --> to verify contract by truffle-plugin-verify for BSCSCAN & ETHSCAN
# truffle run verify <contract name>@<contract addr> --network <network defined in truffle>
BSCSCAN_API=
ETHSCAN_API=
```

4. start modify your contract in ./contracts and ./migration

5. the compiled file will be in ./src/

6. create the front by modifying ./src/App.js: The is in react syntax