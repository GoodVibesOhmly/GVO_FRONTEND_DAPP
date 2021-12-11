/* eslint-disable radix */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Web3 from 'web3';
import { logger } from 'services';
import { BNLike } from 'ethereumjs-util';
import coinGeckoApi from 'api/coingeckoApi';
import slpVaultAbi from './abi/SLPVault.json';
import slpTokenAbi from '../SLPToken/SLPToken.json';
import newoTokenAbi from '../Staking/Governance-Token.json';
import usdcTokenAbi from './abi/USDCToken.json';

const SLP_VAULT = process.env.REACT_APP_SLP_VAULT;
const SLP_TOKEN = process.env.REACT_APP_SLP_TOKEN_ADDRESS;
const NEWO_TOKEN = process.env.REACT_APP_TOKEN_ADDRESS;
const USDC_TOKEN = process.env.REACT_APP_USDC_TOKEN_ADDRESS;

export default class SLPVault {
  public slpTokenInstance;

  public slpVaultInstance;

  public newoTokenInstance;

  public usdcTokenInstance;

  public yearInSeconds = 31536000;

  public dayInSeconds = 86400;

  public newoTokenId = 'new-order';

  constructor() {
    window.web3 = new Web3(window.ethereum);

    const slpVaultAbstract = slpVaultAbi;

    this.slpTokenInstance = new window.web3.eth.Contract(
      slpTokenAbi,
      SLP_TOKEN,
    );

    this.slpVaultInstance = new window.web3.eth.Contract(
      slpVaultAbstract,
      SLP_VAULT,
    );

    this.newoTokenInstance = new window.web3.eth.Contract(
      newoTokenAbi,
      NEWO_TOKEN,
    );

    this.usdcTokenInstance = new window.web3.eth.Contract(
      usdcTokenAbi,
      USDC_TOKEN,
    );
  }

  async getLatestNewoTokenPrice() {
    let currentPrice = 0;

    await coinGeckoApi
      .get(`/coins/${this.newoTokenId}`)
      .then((res) => {
        currentPrice = res.data.market_data.current_price.usd;
      })
      .catch((err) => {
        logger.log(err);
      });

    return currentPrice;
  }

  async getTokenBalance(who: string) {
    const balance = await this.slpTokenInstance.methods.balanceOf(who).call();

    const formattedBal = Number((Number(balance) / 10 ** 18).toFixed(6));

    return formattedBal;
  }

  async getVaultBalance() {
    const balance = await this.slpVaultInstance.methods.totalSupply().call();

    const formattedBal = Number((Number(balance) / 10 ** 18).toFixed(6));

    return formattedBal;
  }

  async getUserVaultBalance(who: string) {
    const balance = await this.slpVaultInstance.methods.balanceOf(who).call();

    const formattedBal = Number((Number(balance) / 10 ** 18).toFixed(6));

    return formattedBal;
  }

  async getApproval(spender: string, amount: number | BNLike, sender: string) {
    try {
      const tx = await this.slpTokenInstance.methods
        .approve(spender, amount)
        .send({ from: sender }, (error, transactionHash) => {
          if (error) {
            return false;
          }

          return transactionHash.hash;
        });

      return tx;
    } catch (error) {
      return false;
    }
  }

  async getAllowance(who: string, spender: string) {
    try {
      const tx = await this.slpTokenInstance.methods
        .allowance(who, spender)
        .call();

      return tx;
    } catch (err) {
      return false;
    }
  }

  async userDeposit(amount: number, who: string) {
    try {
      const tokens = window.web3.utils.toWei(amount.toString(), 'ether');
      const bnValue = window.web3.utils.toBN(tokens);
      const estimate = await this.slpVaultInstance.methods
        .stake(bnValue)
        .estimateGas({ from: who });

      const tx = await this.slpVaultInstance.methods
        .stake(tokens)
        .send(
          { from: who, gas: estimate + 10000 },
          (error, transactionHash) => {
            if (error) {
              return false;
            }

            return transactionHash.hash;
          },
        );

      return tx;
    } catch (error) {
      return false;
    }
  }

  async getStrategyAPY() {
    const totalNewo = await this.newoTokenInstance.methods
      .balanceOf(SLP_TOKEN)
      .call();
    const formattedTotalNewo = totalNewo / 10 ** 18;

    const totalUsdc = await this.usdcTokenInstance.methods
      .balanceOf(SLP_TOKEN)
      .call();
    const formattedTotalUsdc = totalUsdc / 10 ** 6;

    const rewardRate = await this.slpVaultInstance.methods.rewardRate().call();
    const formattedRewardRate = rewardRate / 10 ** 18;
    const tokenPrice = await this.getLatestNewoTokenPrice();

    const tvl = (formattedTotalUsdc + formattedTotalNewo) * tokenPrice;

    const apy =
      ((formattedRewardRate * tokenPrice) / tvl) * this.yearInSeconds * 100;

    const formattedApy = Number(apy.toFixed(4));

    return formattedApy;
  }

  async userWithDrawAll(who: string) {
    try {
      const estimate = await this.slpVaultInstance.methods
        .exit()
        .estimateGas({ from: who });

      const tx = await this.slpVaultInstance.methods
        .exit()
        .send({ from: who, gas: estimate }, (error, transactionHash) => {
          if (error) {
            return false;
          }

          return transactionHash.hash;
        });

      return tx;
    } catch (error) {
      return false;
    }
  }

  async getRewards(who: string) {
    const rewards = await this.slpVaultInstance.methods.earned(who).call();

    const formattedBal = Number((Number(rewards) / 10 ** 18).toFixed(6));

    return formattedBal;
  }
}
