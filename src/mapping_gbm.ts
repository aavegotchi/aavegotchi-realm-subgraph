import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  GBM,
  Auction_BidPlaced,
  Auction_BidRemoved,
  Auction_EndTimeUpdated,
  Auction_IncentivePaid,
  Auction_Initialized,
  Auction_StartTimeUpdated,
  Contract_BiddingAllowed,
} from "../generated/GBM/GBM";
import {
  Auction,
  Contract,
  Statistic,
  Incentive,
  Parcel,
} from "../generated/schema";

import { getOrCreateBid, getOrCreateUser } from "./helper";

export function handleAuction_BidPlaced(event: Auction_BidPlaced): void {
  //Auction
  let auction = Auction.load(event.params._auctionID.toString());
  let bid = getOrCreateBid(
    event.params._bidder,
    event.params._bidAmount,
    auction as Auction,
    event
  );

  //Set new bid
  auction.totalBids = auction.totalBids.plus(BigInt.fromI32(1));
  auction.lastBidTime = event.block.timestamp;
  auction.highestBid = event.params._bidAmount;
  auction.highestBidder = event.params._bidder;

  //Update user
  let user = getOrCreateUser(event.params._bidder);
  user.bids = user.bids.plus(BigInt.fromI32(1));
  user.bidAmount = user.bidAmount.plus(event.params._bidAmount);

  user.save();
  auction.save();
  bid.save();
}

export function handleAuction_BidRemoved(event: Auction_BidRemoved): void {
  let auction = Auction.load(event.params._auctionID.toString());
  let entity = getOrCreateBid(
    event.params._bidder,
    event.params._bidAmount,
    auction as Auction,
    event
  );

  //Update user
  let user = getOrCreateUser(event.params._bidder);
  user.outbids = user.outbids.plus(BigInt.fromI32(1));

  entity.outbid = true;
  entity.save();
  user.save();
}

export function handleAuction_EndTimeUpdated(
  event: Auction_EndTimeUpdated
): void {
  let entity = Auction.load(event.params._auctionID.toString());
  entity.endTime = event.params._endTime;
  entity.save();
}

export function handleAuction_IncentivePaid(
  event: Auction_IncentivePaid
): void {
  let incentiveId =
    event.params._auctionID.toString() +
    "_" +
    event.params._earner.toHexString() +
    "_" +
    event.params._incentiveAmount.toString();

  let incentive = Incentive.load(incentiveId);

  if (incentive == null) {
    incentive = new Incentive(incentiveId);
  }

  incentive.amount = event.params._incentiveAmount;
  incentive.earner = event.params._earner;
  incentive.auctionID = event.params._auctionID;
  incentive.receiveTime = event.block.timestamp;

  let auction = Auction.load(event.params._auctionID.toString());
  incentive.tokenIndex = auction.tokenIndex;
  incentive.tokenId = auction.tokenId;
  incentive.contractAddress = auction.contractAddress;
  incentive.type = auction.type;
  incentive.auctionOrderId = auction.orderId;

  let user = getOrCreateUser(event.params._earner);
  user.payouts = user.payouts.plus(BigInt.fromI32(1));
  user.payoutAmount = user.payoutAmount.plus(event.params._incentiveAmount);

  user.save();
  incentive.save();
}

export function handleAuction_Initialized(event: Auction_Initialized): void {
  //Update statistics
  let statistics = Statistic.load("0");
  if (statistics == null) {
    statistics = new Statistic("0");
    statistics.erc721Auctions = BigInt.fromI32(0);
    statistics.erc1155Auctions = BigInt.fromI32(0);
  }

  let orderId = BigInt.fromI32(0);
  let type =
    event.params._tokenKind.toHexString() == "0x973bb640"
      ? "erc1155"
      : "erc721";

  if (type == "erc1155") {
    statistics.erc1155Auctions = statistics.erc1155Auctions.plus(
      BigInt.fromI32(1)
    );
    orderId = statistics.erc1155Auctions;
  } else {
    statistics.erc721Auctions = statistics.erc721Auctions.plus(
      BigInt.fromI32(1)
    );
    orderId = statistics.erc721Auctions;
  }
  statistics.save();

  let auction = Auction.load(event.params._auctionID.toString());

  if (auction == null) {
    auction = new Auction(event.params._auctionID.toString());
  }

  auction.orderId = orderId;
  auction.type = type;
  auction.contractAddress = event.params._contractAddress;
  auction.tokenId = event.params._tokenID;
  auction.tokenIndex = event.params._tokenIndex;
  auction.totalBids = BigInt.fromI32(0);
  auction.claimed = false;
  auction.lastBidTime = BigInt.fromI32(0);
  auction.highestBid = BigInt.fromI32(0);
  auction.highestBidder = Address.fromString(
    "0x0000000000000000000000000000000000000000"
  );

  //Fetch auction info from contract
  let contract = GBM.bind(event.address);

  let result = contract.try_getAuctionInfo(event.params._auctionID);

  if (!result.reverted) {
    let auctionInfo = result.value;
    auction.hammerTimeDuration = auctionInfo.hammerTimeDuration;
    auction.bidDecimals = auctionInfo.bidDecimals;
    auction.stepMin = auctionInfo.stepMin;
    auction.incMin = auctionInfo.incMin;
    auction.incMax = auctionInfo.incMax;
    auction.bidMultiplier = auctionInfo.bidMultiplier;
    auction.endTime = auctionInfo.endTime;
    auction.startTime = auctionInfo.startTime;

    if (auction.incMax.toI32() == 0) auction.incentivePreset = "none";
    else if (auction.incMax.toI32() == 5000) auction.incentivePreset = "low";
    else if (auction.incMax.toI32() == 10000)
      auction.incentivePreset = "medium";
    else if (auction.incMax.toI32() == 15000) auction.incentivePreset = "high";
    else if (auction.incMax.toI32() == 30000) auction.incentivePreset = "degen";
    else auction.incentivePreset = "unknown";
  }

  let contractEntity = Contract.load(
    event.params._contractAddress.toHexString()
  );
  if (contractEntity == null) {
    contractEntity = new Contract(event.params._contractAddress.toHexString());
    contractEntity.biddingAllowed = false;
  }

  contractEntity.save();

  //Initialize Parcel
  let parcel = Parcel.load(event.params._tokenID.toString());
  auction.parcelId = parcel.parcelId;
  auction.parcelHash = parcel.parcelHash;
  auction.parcelSize = parcel.size;

  auction.fudBoost = parcel.fudBoost;
  auction.fomoBoost = parcel.fomoBoost;
  auction.alphaBoost = parcel.alphaBoost;
  auction.kekBoost = parcel.kekBoost;
  auction.save();
}

export function handleAuction_StartTimeUpdated(
  event: Auction_StartTimeUpdated
): void {
  let entity = Auction.load(event.params._auctionID.toString());
  entity.startTime = event.params._startTime;
  entity.save();
}

export function handleContract_BiddingAllowed(
  event: Contract_BiddingAllowed
): void {
  let entity = Contract.load(event.params._contract.toHexString());
  if (entity == null) {
    entity = new Contract(event.params._contract.toHexString());
  }
  entity.biddingAllowed = event.params._biddingAllowed;
  entity.save();
}

/*
export function handleAuction_ItemClaimed(event: Auction_ItemClaimed): void {
  let auction = Auction.load(event.params._auctionID.toString());
  auction.claimed = true;

  let bid = getOrCreateBid(
    auction.highestBidder,
    auction.highestBid,
    auction as Auction,
    event
  );
  bid.claimed = true;

  let user = getOrCreateUser(auction.highestBidder);
  user.wins = user.wins.plus(BigInt.fromI32(1));

  user.save();

  bid.save();
  auction.save();
}

*/
