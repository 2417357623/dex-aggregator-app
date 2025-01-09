const token_dialog = document.querySelector("#token_dialog");
const fromDialog = document.querySelector("#from-intro");
const toDialog = document.querySelector("#to-intro");
const dialogCancel = document.querySelector("#cancel");
const contentList = document.querySelector(".content-list");
const fromTokenImg = document.querySelector("#fromTokenImg");
const fromTokenText = document.querySelector("#fromTokenText");
const toInput = document.querySelector("#toInput");
const fromInput = document.querySelector("#fromInput");
const toTokenImg = document.querySelector("#toTokenImg");
const toTokenText = document.querySelector("#toTokenText");
const gasEstimate = document.querySelector(".gas-estimate");
const swapBtn = document.querySelector("#swap-btn");

import qs from "qs";
import axios from "axios";
import * as ethers from "ethers";
// import {ethers} from 'ethers'
import abi from "erc-20-abi";
import BigNumber from "bignumber.js";

var currentSide = "";
var currentTrade = {};

async function connect() {
  if (typeof window.ethereum !== undefined) {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });
    document.querySelector(".connectBtn").innerHTML = accounts[0];
  } else {
    document.querySelector(".connectBtn").innerHTML = "pls install MetaMask";
  }
}

async function init() {
  await listAvailableTokens();
}

//注意appendchild动态加载dom和innerhtml用string整个替换dom
//tokenlist也是一个规范，用于调用token的相关api的json格式。
async function listAvailableTokens() {
  console.log("initializing");
  const res = await fetch("https://tokens.coingecko.com/uniswap/all.json");
  const tokenListJson = await res.json();
  console.log(tokenListJson);
  let tokens = tokenListJson.tokens.slice(1, 50);
  for (const i in tokens) {
    let div = document.createElement("div");
    div.className = "token-row";
    let html = `<img class="token-list-img" src="${tokens[i].logoURI}" />
        <span class="token-list-text">${tokens[i].symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(tokens[i]);
    };
    contentList.appendChild(div);
  }
}

function selectToken(token) {
  currentTrade[currentSide] = token;
  token_dialog.close();
  console.log(currentTrade);
  renderInterface();
}

function renderInterface() {
  if (currentTrade.from) {
    fromTokenImg.src = currentTrade.from.logoURI;
    fromTokenText.innerHTML = currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    toTokenImg.src = currentTrade.to.logoURI;
    toTokenText.innerHTML = currentTrade.to.symbol;
  }
}

async function getPrice() {
  let amount = Number(fromInput.value * 10 ** currentTrade.from.decimals);
  const params = {
    chainId: currentTrade.from.chainId,
    sellToken: currentTrade.from.address,
    buyToken: currentTrade.to.address,
    sellAmount: amount,
  };

  //This error occurs because browsers block requests with custom headers (e.g., 0x-version) unless explicitly allowed by the server. Making API calls from a browser is not recommended because it can expose your API keys.
  //https://0x.org/docs/developer-resources/faqs-and-troubleshooting
  //   const res = await fetch(
  //     `https://api.0x.org/swap/permit2/price?${qs.stringify(params)}`,
  //     {
  //       headers: {
  //         '0x-api-key': '21be22c6-fc82-49bb-bf09-3ee1c0a0d9a1', // Get your live API key from the 0x Dashboard (https://dashboard.0x.org/apps)
  //         '0x-version': 'v2',
  //       },
  //       method:'GET'
  //     }
  //   );
  const res = await axios.get(
    `/api/swap/permit2/price?${qs.stringify(params)}`,
    {
      headers: {
        "0x-api-key": "21be22c6-fc82-49bb-bf09-3ee1c0a0d9a1", // Get your live API key from the 0x Dashboard (https://dashboard.0x.org/apps)
        "0x-version": "v2",
      },
      method: "GET",
    }
  );
  console.log(res);

  const swapPriceJson = res.data;
  toInput.value = swapPriceJson.buyAmount / 10 ** currentTrade.to.decimals;
  gasEstimate.innerHTML = swapPriceJson.gasPrice;
}

async function getQuote(account) {
  const amount = fromInput.value * 10 ** currentTrade.from.decimals;
  const params = {
    chainId: 1,
    buyToken: currentTrade.to.address,
    sellToken: currentTrade.from.address,
    sellAmount: amount,
    taker: account,
  };
  const res = await axios.get(
    `/api/swap/permit2/quote?${qs.stringify(params)}`,
    {
      headers: {
        "0x-api-key": "21be22c6-fc82-49bb-bf09-3ee1c0a0d9a1", // Get your live API key from the 0x Dashboard (https://dashboard.0x.org/apps)
        "0x-version": "v2",
      },
      method: "GET",
    }
  );
  const swapQuoteJson = res.data;
  console.log(swapQuoteJson);
  toInput.value = swapQuoteJson.buyAmount / 10 ** currentTrade.to.decimals;
  gasEstimate.innerHTML = swapQuoteJson.gasPrice;
  return swapQuoteJson
}

async function trySwap() {
  const accounts = await ethereum.request({ method: "eth_accounts" });
  const takerAccounts = accounts[0];

  const quote = await getQuote(takerAccounts);

  //与合约交互
  const provider = new ethers.BrowserProvider(window.ethereum);
  //es2020处理大整形的方式
//   const maxApproval = BigInt(2 ** 256);
  const maxApproval = ethers.parseEther("3")
  const signer = await provider.getSigner()
  //请阅读ethers v6官网，state-change need to use signer.
  const tokenContract = new ethers.Contract(
    currentTrade.from.address,
    abi,
    signer
  );
  console.log("contract info",tokenContract);

  //set the token allowance
  const tx = await tokenContract.approve(quote.issues.allowance.spender, maxApproval)
  await tx.wait();
  const finalTx = await signer.sendTransaction(quote)
  const receipt = await finalTx.wait()
  console.log(receipt)
}

init();
document.querySelector(".connectBtn").onclick = connect;

fromDialog.addEventListener("click", () => {
  token_dialog.showModal();
  currentSide = "from";
});
toDialog.addEventListener("click", () => {
  token_dialog.showModal();
  currentSide = "to";
});
dialogCancel.addEventListener("click", () => {
  token_dialog.close();
});

fromInput.addEventListener("input", () => {
  getPrice();
});

swapBtn.addEventListener("click", () => {
  trySwap();
});
