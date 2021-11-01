import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { RealmDiamond } from "../generated/RealmDiamond/RealmDiamond";
import { Auction, Bid, User, Parcel } from "../generated/schema";
import { BIGINT_ZERO } from "./constants";

export function getOrCreateParcel(
  tokenId: BigInt,
  owner: Bytes,
  tokenAddress: Address
): Parcel {
  let parcel = Parcel.load(tokenId.toString());

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (parcel == null) {
    parcel = new Parcel(tokenId.toString());
    parcel.timesTraded = BIGINT_ZERO;
  }

  log.debug("token address: {}", [tokenAddress.toHexString()]);

  let contract = RealmDiamond.bind(tokenAddress);
  let parcelInfo = contract.try_getParcelInfo(tokenId);

  if (parcelInfo.reverted) {
  } else {
    let parcelMetadata = parcelInfo.value;
    parcel.parcelId = parcelMetadata.parcelId;
    parcel.tokenId = tokenId;

    let user = getOrCreateUser(owner);
    user.save();
    parcel.owner = user.id;

    parcel.coordinateX = parcelMetadata.coordinateX;
    parcel.coordinateY = parcelMetadata.coordinateY;
    parcel.district = parcelMetadata.district;
    parcel.parcelHash = parcelMetadata.parcelAddress;

    let boostArray = parcelMetadata.boost;
    parcel.fudBoost = boostArray[0];
    parcel.fomoBoost = boostArray[1];
    parcel.alphaBoost = boostArray[2];
    parcel.kekBoost = boostArray[3];

    parcel.size = parcelMetadata.size;
  }

  return parcel as Parcel;
}

export function getOrCreateBid(
  bidder: Bytes,
  bidAmount: BigInt,
  auction: Auction,
  event: ethereum.Event
): Bid {
  let bidId =
    auction.id + "_" + bidder.toHexString() + "_" + bidAmount.toString();
  let bid = Bid.load(bidId);
  if (bid == null) {
    bid = new Bid(bidId);
    bid.bidder = bidder;
    bid.amount = bidAmount;
    bid.auctionID = BigInt.fromString(auction.id);
    bid.outbid = false;
    bid.bidTime = event.block.timestamp;
    bid.claimed = false;

    //Set the previous bid / bidder
    bid.previousBid = auction.highestBid;
    bid.previousBidder = auction.highestBidder;

    //Get tokenId and tokenIndex
    bid.tokenId = auction.tokenId;
    bid.tokenIndex = auction.tokenIndex;
    bid.contractAddress = auction.contractAddress;
    bid.type = auction.type;

    //Get remaining auction time
    bid.auctionTimeLeft = auction.endTime.minus(event.block.timestamp);
    bid.auctionOrderId = auction.orderId;
    bid.auctionEndTime = auction.endTime;
  }

  return bid as Bid;
}

export function getOrCreateUser(address: Bytes): User {
  let user = User.load(address.toHexString());
  if (user == null) {
    user = new User(address.toHexString());
    user.bids = BigInt.fromI32(0);
    user.bidAmount = BigInt.fromI32(0);
    user.outbids = BigInt.fromI32(0);
    user.payouts = BigInt.fromI32(0);
    user.payoutAmount = BigInt.fromI32(0);
    user.wins = BigInt.fromI32(0);
  }

  return user as User;
}
