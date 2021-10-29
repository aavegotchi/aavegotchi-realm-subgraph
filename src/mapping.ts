import {
  RealmDiamond,
  OwnershipTransferred,
  OwnershipTransferred1,
  Approval,
  ApprovalForAll,
  MintParcel,
  Transfer,
  OwnershipTransferred2,
  Approval1,
  ApprovalForAll1,
  MintParcel1,
  Transfer1,
  ResyncParcel,
} from "../generated/RealmDiamond/RealmDiamond";
import { Auction, Parcel } from "../generated/schema";
import { getOrCreateUser } from "./helper";

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleOwnershipTransferred1(
  event: OwnershipTransferred1
): void {}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}

export function handleMintParcel(event: MintParcel): void {
  let parcel = Parcel.load(event.params._tokenId.toString());

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (parcel == null) {
    parcel = new Parcel(event.params._tokenId.toString());
  }

  let contract = RealmDiamond.bind(event.address);
  let parcelInfo = contract.try_getParcelInfo(event.params._tokenId);

  if (parcelInfo.reverted) {
  } else {
    let parcelMetadata = parcelInfo.value;
    parcel.parcelId = parcelMetadata.parcelId;
    parcel.tokenId = event.params._tokenId;
    
    let user = getOrCreateUser(event.params._owner);
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

  // Entities can be written to the store with `.save()`
  parcel.save();
}

export function handleTransfer(event: Transfer): void {
  let user = getOrCreateUser(event.params._to);
  user.save();

  let parcel = Parcel.load(event.params._tokenId.toString());
  parcel.owner = user.id;
  parcel.save();
}

export function handleResyncParcel(event: ResyncParcel): void {
  let parcel = Parcel.load(event.params._tokenId.toString());

  let contract = RealmDiamond.bind(event.address);
  let parcelInfo = contract.try_getParcelInfo(event.params._tokenId);

  if (parcelInfo.reverted) {
  } else {
    let parcelMetadata = parcelInfo.value;
    parcel.parcelId = parcelMetadata.parcelId;
    parcel.tokenId = event.params._tokenId;
    parcel.coordinateX = parcelMetadata.coordinateX;
    parcel.coordinateY = parcelMetadata.coordinateY;
    parcel.district = parcelMetadata.district;
    parcel.parcelHash = parcelMetadata.parcelAddress;

    parcel.size = parcelMetadata.size;

    let boostArray = parcelMetadata.boost;
    parcel.fudBoost = boostArray[0];
    parcel.fomoBoost = boostArray[1];
    parcel.alphaBoost = boostArray[2];
    parcel.kekBoost = boostArray[3];

    // Update Boosts in Auction
    let auction = Auction.load(parcel.auctionId);
    if(auction != null) {
      auction.fudBoost = boostArray[0];
      auction.fomoBoost = boostArray[1];
      auction.alphaBoost = boostArray[2];
      auction.kekBoost = boostArray[3];
      auction.save();
    }
  }

  //update auction too

  // Entities can be written to the store with `.save()`
  parcel.save();
}

export function handleOwnershipTransferred2(
  event: OwnershipTransferred2
): void {}

export function handleApproval1(event: Approval1): void {}

export function handleApprovalForAll1(event: ApprovalForAll1): void {}

export function handleMintParcel1(event: MintParcel1): void {}

export function handleTransfer1(event: Transfer1): void {}
