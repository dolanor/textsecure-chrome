//TODO: Stolen from MDN (copyright...)
function b64ToUint6 (nChr) {

  return nChr > 64 && nChr < 91 ?
      nChr - 65
    : nChr > 96 && nChr < 123 ?
      nChr - 71
    : nChr > 47 && nChr < 58 ?
      nChr + 4
    : nChr === 43 ?
      62
    : nChr === 47 ?
      63
    :
      0;

}

function base64DecToArr (sBase64, nBlocksSize) {
  var
    sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
    nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2;
var aBBytes = new ArrayBuffer(nOutLen);
var taBytes = new Uint8Array(aBBytes);

  for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
      }
      nUint24 = 0;
    }
  }
  return aBBytes;
}

/* Base64 string to array encoding */

function uint6ToB64 (nUint6) {

  return nUint6 < 26 ?
      nUint6 + 65
    : nUint6 < 52 ?
      nUint6 + 71
    : nUint6 < 62 ?
      nUint6 - 4
    : nUint6 === 62 ?
      43
    : nUint6 === 63 ?
      47
    :
      65;

}

function base64EncArr (aBytes) {

  var nMod3, sB64Enc = "";

  for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
    nMod3 = nIdx % 3;
    //if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
    nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
      nUint24 = 0;
    }
  }

  return sB64Enc.replace(/A(?=A$|$)/g, "=");

}

var USE_NACL = false;

/*********************************
 *** Type conversion utilities ***
 *********************************/
// Strings/arrays
//TODO: Throw all this shit in favor of consistent types
var StaticByteBufferProto = new dcodeIO.ByteBuffer().__proto__;
var StaticArrayBufferProto = new ArrayBuffer().__proto__;
var StaticUint8ArrayProto = new Uint8Array().__proto__;
var StaticWordArrayProto = CryptoJS.lib.WordArray.create('').__proto__;
function getString(thing) {
	if (thing === Object(thing)) {
		if (thing.__proto__ == StaticUint8ArrayProto)
			return String.fromCharCode.apply(null, thing);
		if (thing.__proto__ == StaticArrayBufferProto)
			return getString(new Uint8Array(thing));
		if (thing.__proto__ == StaticByteBufferProto)
			return thing.toString("binary");
		if (thing.__proto__ == StaticWordArrayProto)
			return thing.toString(CryptoJS.enc.Latin1);
	}
	return thing;
}

function getStringable(thing) {
	return (typeof thing == "string" || typeof thing == "number" || typeof thing == "boolean" ||
			(thing === Object(thing) &&
				(thing.__proto__ == StaticArrayBufferProto ||
				thing.__proto__ == StaticUint8ArrayProto ||
				thing.__proto__ == StaticByteBufferProto ||
				thing.__proto__ == StaticWordArrayProto)));
}

function toArrayBuffer(thing) {
	//TODO: Optimize this for specific cases
	if (thing === undefined)
		return undefined;
	if (thing === Object(thing) && thing.__proto__ == StaticArrayBufferProto)
		return thing;

	if (thing instanceof Array) {
		// Assuming Uint16Array from curve25519
		var res = new ArrayBuffer(thing.length * 2);
		var uint = new Uint16Array(res);
		for (var i = 0; i < thing.length; i++)
			uint[i] = thing[i];
		return res;
	}

	if (!getStringable(thing))
		throw "Tried to convert a non-stringable thing of type " + typeof thing + " to an array buffer";
	var str = getString(thing);
	var res = new ArrayBuffer(str.length);
	var uint = new Uint8Array(res);
	for (var i = 0; i < str.length; i++)
		uint[i] = str.charCodeAt(i);
	return res;
}

function ensureStringed(thing) {
	if (getStringable(thing))
		return getString(thing);
	else if (thing instanceof Array) {
		var res = [];
		for (var i = 0; i < thing.length; i++)
			res[i] = ensureStringed(thing);
		return res;
	} else if (thing === Object(thing)) {
		var res = {};
		for (key in thing)
			res[key] = ensureStringed(thing[key]);
		return res;
	}
	throw "unsure of how to jsonify object of type " + typeof thing;

}

function jsonThing(thing) {
	return JSON.stringify(ensureStringed(thing));
}

function getArrayBuffer(string) {
	return base64DecToArr(btoa(string));
}

function base64ToArrayBuffer(string) {
	return base64DecToArr(string);
}

// Protobuf decodingA
//TODO: throw on missing fields everywhere
var IncomingPushMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/IncomingPushMessageSignal.proto").build("textsecure.IncomingPushMessageSignal");
function decodeIncomingPushMessageProtobuf(string) {
	return IncomingPushMessageProtobuf.decode(btoa(string));
}

var PushMessageContentProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/IncomingPushMessageSignal.proto").build("textsecure.PushMessageContent");
function decodePushMessageContentProtobuf(string) {
	return PushMessageContentProtobuf.decode(btoa(string));
}

var WhisperMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/WhisperTextProtocol.proto").build("textsecure.WhisperMessage");
function decodeWhisperMessageProtobuf(string) {
	return WhisperMessageProtobuf.decode(btoa(string));
}

var PreKeyWhisperMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/WhisperTextProtocol.proto").build("textsecure.PreKeyWhisperMessage");
function decodePreKeyWhisperMessageProtobuf(string) {
	return PreKeyWhisperMessageProtobuf.decode(btoa(string));
}

var KeyExchangeMessageProtobuf = dcodeIO.ProtoBuf.loadProtoFile("protos/WhisperTextProtocol.proto").build("textsecure.KeyExchangeMessage");
function decodeKeyExchangeMessageProtobuf(string) {
	return KeyExchangeMessageProtobuf.decode(btoa(string));
}

// Number formatting
function getNumberFromString(string) {
	return string.split(".")[0];
}

function getEncodedNumber(number) {
	var split = number.split(".");
	if (split.length > 1) {
		if (split[1] == 1)
			return split[0];
		else
			return number;
	} else
		return number;
}

function getDeviceId(encodedNumber) {
	var split = encodedNumber.split(".");
	if (split.length > 1)
		return split[1];
	return 1;
}

// Other

function timestampToHumanReadable(timestamp) {
	var date = new Date();
	date.setTime(timestamp*1000);
	return date.toUTCString();
}

function objectContainsKeys(object) {
	var count = 0;
	for (key in object) {
		count++;
		break;
	}
	return count != 0;
}

/************************************************
 *** Utilities to store data in local storage ***
 ************************************************/
var storage = {};

storage.putEncrypted = function(key, value) {
	//TODO
	if (value === undefined)
		throw "Tried to store undefined";
	localStorage.setItem("e" + key, jsonThing(value));
}

storage.getEncrypted = function(key, defaultValue) {
//TODO
	var value = localStorage.getItem("e" + key);
	if (value === null)
		return defaultValue;
	return JSON.parse(value);
}

storage.removeEncrypted = function(key) {
	//TODO
}

storage.putUnencrypted = function(key, value) {
	if (value === undefined)
		throw "Tried to store undefined";
	localStorage.setItem("u" + key, jsonThing(value));
}

storage.getUnencrypted = function(key, defaultValue) {
	var value = localStorage.getItem("u" + key);
	if (value === null)
		return defaultValue;
	return JSON.parse(value);
}

storage.removeUnencrypted = function(key) {
	//TODO
}

function registrationDone() {
	storage.putUnencrypted("registration_done", "");
	//TODO: Fix dirty hack:
	chrome.runtime.reload();
}

function isRegistrationDone() {
	return storage.getUnencrypted("registration_done") !== undefined;
}

function getMessageMap() {
	return storage.getEncrypted("messageMap", {});
}

function storeMessage(outgoingMessageSignal) {
	var messageMap = getMessageMap();
	var conversation = messageMap[outgoingMessageSignal.source]; //TODO: Also support Group message IDs here
	if (conversation === undefined) {
		conversation = []
		messageMap[outgoingMessageSignal.source] = conversation;
	}

	conversation[conversation.length] = { message:    getString(outgoingMessageSignal.message),
										destinations: outgoingMessageSignal.destinations,
										sender:       outgoingMessageSignal.source,
										timestamp:    outgoingMessageSignal.timestamp.div(dcodeIO.Long.fromNumber(1000)).toNumber() };
	storage.putEncrypted("messageMap", messageMap);
	chrome.runtime.sendMessage(conversation[conversation.length - 1]);
}

function getDeviceObject(encodedNumber) {
	return storage.getEncrypted("deviceObject" + getEncodedNumber(encodedNumber));
}

function getDeviceIdListFromNumber(number) {
	return storage.getEncrypted("deviceIdList" + getNumberFromString(number), []);
}

function addDeviceIdForNumber(number, deviceId) {
	var deviceIdList = getDeviceIdListFromNumber(getNumberFromString(number));
	for (var i = 0; i < deviceIdList.length; i++) {
		if (deviceIdList[i] == deviceId)
			return;
	}
	deviceIdList[deviceIdList.length] = deviceId;
	storage.putEncrypted("deviceIdList" + getNumberFromString(number), deviceIdList);
}

// throws "Identity key mismatch"
function saveDeviceObject(deviceObject) {
	var existing = getDeviceObject(deviceObject.encodedNumber);
	if (existing === undefined)
		existing = {encodedNumber: getEncodedNumber(deviceObject.encodedNumber)};
	for (key in deviceObject) {
		if (key == "encodedNumber")
			continue;

		if (key == "identityKey" && deviceObject.identityKey != deviceObject.identityKey)
			throw "Identity key mismatch";

		existing[key] = deviceObject[key];
	}
	storage.putEncrypted("deviceObject" + getEncodedNumber(deviceObject.encodedNumber), existing);
	addDeviceIdForNumber(deviceObject.encodedNumber, getDeviceId(deviceObject.encodedNumber));
}

function getDeviceObjectListFromNumber(number) {
	var deviceObjectList = [];
	var deviceIdList = getDeviceIdListFromNumber(number);
	for (var i = 0; i < deviceIdList.length; i++)
		deviceObjectList[deviceObjectList.length] = getDeviceObject(getNumberFromString(number) + "." + deviceIdList[i]);
	return deviceObjectList;
}

/**********************
 *** NaCL Interface ***
 **********************/
var onLoadCallbacks = [];
var naclLoaded = 0;
function registerOnLoadFunction(func) {
	if (naclLoaded || !USE_NACL) {
		func();
		return;
	}
	onLoadCallbacks[onLoadCallbacks.length] = func;
}

var naclMessageNextId = 0;
var naclMessageIdCallbackMap = {};
function moduleDidLoad() {
	common.hideModule();
	naclLoaded = 1;
	for (var i = 0; i < onLoadCallbacks.length; i++)
		onLoadCallbacks[i]();
	onLoadCallbacks = [];
}

function handleMessage(message) {
	naclMessageIdCallbackMap[message.data.call_id](message.data);
}

function postNaclMessage(message, callback) {
	if (!USE_NACL)
		throw "Attempted to make NaCL call with !USE_NACL?";

	naclMessageIdCallbackMap[naclMessageNextId] = callback;
	message.call_id = naclMessageNextId++;

	common.naclModule.postMessage(message);
}

/*******************************************
 *** Utilities to manage keys/randomness ***
 *******************************************/
function getRandomBytes(size) {
	//TODO: Better random (https://www.grc.com/r&d/js.htm?)
	try {
		var buffer = new ArrayBuffer(size);
		var array = new Uint8Array(buffer);
		window.crypto.getRandomValues(array);
		return buffer;
	} catch (err) {
		//TODO: ummm...wat?
		throw err;
	}
}

// functions exposed for testing
var crypto_tests = {};

(function(crypto, $, undefined) {
	crypto_tests.privToPub = function(privKey, callback) {
		if (privKey.byteLength != 32)
			throw "Invalid private key";

		var prependVersion = function(pubKey) {
			var origPub = new Uint8Array(pubKey);
			var pub = new ArrayBuffer(33);
			var pubWithPrefix = new Uint8Array(pub);
			for (var i = 0; i < 32; i++)
				pubWithPrefix[i+1] = origPub[i];
			pubWithPrefix[0] = 5;
			return pub;
		}

		if (USE_NACL) {
			postNaclMessage({command: "bytesToPriv", priv: privKey}, function(message) {
				postNaclMessage({command: "privToPub", priv: message.res}, function(message) {
					callback({ pubKey: prependVersion(message.res), privKey: privKey });
				});
			});
		} else {
			var priv = new Uint16Array(privKey);
			priv[0] &= 0xFFF8;
			priv[15] = (priv[15] & 0x7FFF) | 0x4000;
			//TODO: fscking type conversion
			callback({ pubKey: prependVersion(toArrayBuffer(curve25519(priv))), privKey: privKey});
		}
	
	}

	var createNewKeyPair = function(callback) {
		crypto_tests.privToPub(getRandomBytes(32), callback);
	}

	var crypto_storage = {};

	crypto_storage.getNewPubKeySTORINGPrivKey = function(keyName, callback) {
		createNewKeyPair(function(keyPair) {
			storage.putEncrypted("25519Key" + keyName, keyPair);
			callback(keyPair.pubKey);
		});
	}

	crypto_storage.getStoredPubKey = function(keyName) {
		return toArrayBuffer(storage.getEncrypted("25519Key" + keyName, { pubKey: undefined }).pubKey);
	}

	crypto_storage.getStoredKeyPair = function(keyName) {
		var res = storage.getEncrypted("25519Key" + keyName);
		if (res === undefined)
			return undefined;
		return { pubKey: toArrayBuffer(res.pubKey), privKey: toArrayBuffer(res.privKey) };
	}

	crypto_storage.getAndRemoveStoredKeyPair = function(keyName) {
		var keyPair = this.getStoredKeyPair(keyName);
		storage.removeEncrypted("25519Key" + keyName);
		return keyPair;
	}

	crypto_storage.getAndRemovePreKeyPair = function(keyId) {
		return this.getAndRemoveStoredKeyPair("preKey" + keyId);
	}

	crypto_storage.getIdentityPrivKey = function() {
		return this.getStoredKeyPair("identityKey").privKey;
	}

	crypto_storage.saveSession = function(encodedNumber, session) {
		storage.putEncrypted("session" + getEncodedNumber(encodedNumber), session);
	}

	crypto_storage.getSession = function(encodedNumber) {
		return storage.getEncrypted("session" + getEncodedNumber(encodedNumber));
	}


	/*****************************
	 *** Internal Crypto stuff ***
	 *****************************/
	//TODO: Think about replacing CryptoJS stuff with optional NaCL-based implementations
	// Probably means all of the low-level crypto stuff here needs pulled out into its own file
	var ECDHE = function(pubKey, privKey, callback) {
		if (privKey !== undefined) {
			privKey = toArrayBuffer(privKey);
			if (privKey.byteLength != 32)
				throw "Invalid private key";
		} else
			throw "Invalid private key";

		if (pubKey !== undefined) {
			pubKey = toArrayBuffer(pubKey);
			var pubView = new Uint8Array(pubKey);
			if (pubKey.byteLength == 33 && pubView[0] == 5) {
				pubKey = new ArrayBuffer(32);
				var pubCopy = new Uint8Array(pubKey);
				for (var i = 0; i < 32; i++)
					pubCopy[i] = pubView[i+1];
			} else if (pubKey.byteLength != 32)
				throw "Invalid public key";
		}

		if (USE_NACL) {
			postNaclMessage({command: "ECDHE", priv: privKey, pub: pubKey}, function(message) {
				callback(message.res);
			});
		} else {
			callback(toArrayBuffer(curve25519(new Uint16Array(privKey), new Uint16Array(pubKey))));
		}
	}
	crypto_tests.ECDHE = ECDHE;

	var HMACSHA256 = function(input, key) {
		//TODO: Waaayyyy less type conversion here (probably just means replacing CryptoJS)
		return CryptoJS.HmacSHA256(
				CryptoJS.lib.WordArray.create(toArrayBuffer(input)),
				CryptoJS.enc.Latin1.parse(getString(key)))
			.toString(CryptoJS.enc.Latin1);
	}

	crypto_tests.HKDF = function(input, salt, info) {
		// Specific implementation of RFC 5869 that only returns exactly 64 bytes
		var PRK = HMACSHA256(input, salt);

		var infoString = getString(info);
		// TextSecure implements a slightly tweaked version of RFC 5869: the 0 and 1 should be 1 and 2 here
		var T1 = HMACSHA256(infoString + String.fromCharCode(0), PRK);
		var T2 = HMACSHA256(getString(T1) + infoString + String.fromCharCode(1), PRK);

		return [ T1, T2 ];
	}

	var HKDF = function(input, salt, info) {
		// HKDF for TextSecure has a bit of additional handling - salts always end up being 32 bytes
		if (salt == '') {
			salt = new ArrayBuffer(32);
			var uintKey = new Uint8Array(salt);
			for (var i = 0; i < 32; i++)
				uintKey[i] = 0;
		}

		salt = toArrayBuffer(salt);

		if (salt.byteLength != 32)
			throw "Got salt of incorrect length";

		return crypto_tests.HKDF(input, salt, info);
	}

	var decryptPaddedAES = function(ciphertext, key, iv) {
		//TODO: Waaayyyy less type conversion here (probably just means replacing CryptoJS)
		return CryptoJS.AES.decrypt(btoa(getString(ciphertext)),
				CryptoJS.enc.Latin1.parse(getString(key)),
				{iv: CryptoJS.enc.Latin1.parse(getString(iv))})
			.toString(CryptoJS.enc.Latin1);
	}

	var decryptAESCTR = function(ciphertext, key, counter) {
		//TODO: Waaayyyy less type conversion here (probably just means replacing CryptoJS)
		return CryptoJS.AES.decrypt(btoa(getString(ciphertext)),
				CryptoJS.enc.Latin1.parse(getString(key)),
				{mode: CryptoJS.mode.CTR, iv: CryptoJS.enc.Latin1.parse(""), padding: CryptoJS.pad.NoPadding})
			.toString(CryptoJS.enc.Latin1);
	}

	var encryptAESCTR = function(plaintext, key, counter) {
		//TODO: Waaayyyy less type conversion here (probably just means replacing CryptoJS)
		return CryptoJS.AES.encrypt(CryptoJS.enc.Latin1.parse(getString(plaintext)),
				CryptoJS.enc.Latin1.parse(getString(key)),
				{mode: CryptoJS.mode.CTR, iv: CryptoJS.enc.Latin1.parse(""), padding: CryptoJS.pad.NoPadding})
			.ciphertext.toString(CryptoJS.enc.Latin1);
	}

	var verifyMACWithVersionByte = function(data, key, mac, version) {
		if (version === undefined)
			version = 1;

		var calculated_mac = HMACSHA256(String.fromCharCode(version) + getString(data), key);
		var macString = getString(mac);

		if (calculated_mac.substring(0, macString.length) != macString)
			throw "Bad MAC";
	}

	var calculateMACWithVersionByte = function(data, key, version) {
		if (version === undefined)
			version = 1;

		return HMACSHA256(String.fromCharCode(version) + getString(data), key);
	}

	/******************************
	 *** Ratchet implementation ***
	 ******************************/
	var initSession = function(isInitiator, ourEphemeralKey, encodedNumber, theirIdentityPubKey, theirEphemeralPubKey, callback) {
		var ourIdentityPrivKey = crypto_storage.getIdentityPrivKey();

		var sharedSecret;
		ECDHE(theirEphemeralPubKey, ourIdentityPrivKey, function(ecRes) {
			sharedSecret = getString(ecRes);

			function finishInit() {
				ECDHE(theirEphemeralPubKey, ourEphemeralKey.privKey, function(ecRes) {
					sharedSecret += getString(ecRes);
					var masterKey = HKDF(sharedSecret, '', "WhisperText");

					var session = {currentRatchet: { rootKey: masterKey[0], ephemeralKeyPair: ourEphemeralKey,
														lastRemoteEphemeralKey: theirEphemeralPubKey },
									oldRatchetList: []
								};
					session[getString(ourEphemeralKey.pubKey)] = { messageKeys: {},  chainKey: { counter: -1, key: masterKey[1] } };
					// This isnt an actual ratchet, its just here to make maybeStepRatchet work
					session[getString(theirEphemeralPubKey)] = { messageKeys: {},  chainKey: { counter: 0xffffffff, key: '' } };
					crypto_storage.saveSession(encodedNumber, session);

					callback();
				});
			}

			if (isInitiator) {
				ECDHE(theirIdentityPubKey, ourEphemeralKey.privKey, function(ecRes) {
					sharedSecret = sharedSecret + getString(ecRes);
					finishInit();
				});
			} else {
				ECDHE(theirIdentityPubKey, ourEphemeralKey.privKey, function(ecRes) {
					sharedSecret = getString(ecRes) + sharedSecret;
					finishInit();
				});
			}
		});
	}

	var initSessionFromPreKeyWhisperMessage = function(encodedNumber, message, callback) {
		//TODO: Check remote identity key matches known-good key

		var preKeyPair = crypto_storage.getAndRemovePreKeyPair(message.preKeyId);
		if (preKeyPair === undefined)
			throw "Missing preKey for PreKeyWhisperMessage";

		initSession(false, preKeyPair, encodedNumber, message.identityKey, message.baseKey, function() {
			callback();
		});
	}

	var fillMessageKeys = function(chain, counter) {
		var messageKeys = chain.messageKeys;
		var key = chain.chainKey.key;
		for (var i = chain.chainKey.counter; i < counter; i++) {
			messageKeys[i + 1] = HMACSHA256(String.fromCharCode(1), key);
			key = HMACSHA256(String.fromCharCode(2), key);
		}
		chain.chainKey.key = key;
		chain.chainKey.counter = counter;
	}

	var maybeStepRatchet = function(session, remoteKey, previousCounter, callback) {
		if (session[getString(remoteKey)] !== undefined) { //TODO: null???
			callback();//TODO: This is happening in tests as alice (when bob is checking), probably shouldn't?
			return;
		}

		var ratchet = session.currentRatchet;

		var previousRatchet = session[getString(ratchet.lastRemoteEphemeralKey)];
		fillMessageKeys(previousRatchet, previousCounter);
		if (!objectContainsKeys(previousRatchet.messageKeys))
			delete session[getString(ratchet.lastRemoteEphemeralKey)];
		else
			session.oldRatchetList[session.oldRatchetList.length] = { added: new Date().getTime(), ephemeralKey: ratchet.lastRemoteEphemeralKey };

		delete session[ratchet.ephemeralKeyPair.pubKey];

		ECDHE(remoteKey, ratchet.ephemeralKeyPair.privKey, function(sharedSecret) {
			var masterKey = HKDF(sharedSecret, ratchet.rootKey, "WhisperRatchet");
			session[getString(remoteKey)] = { messageKeys: {}, chainKey: { counter: -1, key: masterKey[1] } };

			createNewKeyPair(function(keyPair) {
				ratchet.ephemeralKeyPair = keyPair;

				ECDHE(remoteKey, ratchet.ephemeralKeyPair.privKey, function(sharedSecret) {
					masterKey = HKDF(sharedSecret, masterKey[0], "WhisperRatchet");
					ratchet.rootKey = masterKey[0];
					session[getString(ratchet.ephemeralKeyPair.pubKey)] = { messageKeys: {}, chainKey: { counter: -1, key: masterKey[1] } };

					ratchet.lastRemoteEphemeralKey = remoteKey;
					callback();
				});
			});
		});
	}

	// returns decrypted protobuf
	var decryptWhisperMessage = function(encodedNumber, messageBytes, callback) {
		var session = crypto_storage.getSession(encodedNumber);
		if (session === undefined)
			throw "No session currently open with " + encodedNumber;

		if (messageBytes[0] != String.fromCharCode((2 << 4) | 2))
			throw "Bad version number on WhisperMessage";

		var messageProto = messageBytes.substring(1, messageBytes.length - 8);
		var mac = messageBytes.substring(messageBytes.length - 8, messageBytes.length);

		var message = decodeWhisperMessageProtobuf(messageProto);

		maybeStepRatchet(session, message.ephemeralKey, message.previousCounter, function() {
			var chain = session[getString(message.ephemeralKey)];

			fillMessageKeys(chain, message.counter);
			var keys = HKDF(chain.messageKeys[message.counter], '', "WhisperMessageKeys");
			delete chain.messageKeys[message.counter];

			verifyMACWithVersionByte(messageProto, keys[1], mac, (2 << 4) | 2);
			var plaintext = decryptAESCTR(message.ciphertext, keys[0], message.counter);

			//TODO: removeOldChains(session);

			crypto_storage.saveSession(encodedNumber, session);
			callback(decodePushMessageContentProtobuf(plaintext));
		});
	}

	/*************************
	 *** Public crypto API ***
	 *************************/
	// Decrypts message into a raw string
	crypto.decryptWebsocketMessage = function(message) {
		var signaling_key = storage.getEncrypted("signaling_key"); //TODO: in crypto_storage
		var aes_key = signaling_key.substring(0, 32);
		var mac_key = signaling_key.substring(32, 32 + 20);

		var decodedMessage = new Uint8Array(base64DecToArr(getString(message)));
		if (decodedMessage[0] != 1)
			throw "Got bad version number: " + decodedMessage[0];

		var iv = decodedMessage.subarray(1, 1 + 16);
		var ciphertext = decodedMessage.subarray(1 + 16, decodedMessage.length - 10);
		var ivAndCipherText = decodedMessage.subarray(1, decodedMessage.length - 10);
		var mac = decodedMessage.subarray(decodedMessage.length - 10, decodedMessage.length);

		verifyMACWithVersionByte(ivAndCipherText, mac_key, mac);

		return decryptPaddedAES(ciphertext, aes_key, iv);
	}

	crypto.handleIncomingPushMessageProto = function(proto, callback) {
		switch(proto.type) {
		case 0: //TYPE_MESSAGE_PLAINTEXT
			callback(decodePushMessageContentProtobuf(getString(proto.message)));
			break;
		case 1: //TYPE_MESSAGE_CIPHERTEXT
			decryptWhisperMessage(proto.source, getString(proto.message), function(result) { callback(result); });
			break;
		case 3: //TYPE_MESSAGE_PREKEY_BUNDLE
			if (proto.message.readUint8() != (2 << 4 | 2))
				throw "Bad version byte"; //TODO: I don't believe this actually happens on the wire
			var preKeyProto = decodePreKeyWhisperMessageProtobuf(getString(proto.message));
			initSessionFromPreKeyWhisperMessage(proto.source, preKeyProto, function() {
				decryptWhisperMessage(proto.source, getString(preKeyProto.message), function(result) { callback(result); });
			});
			break;
		}
	}

	// callback(encoded [PreKey]WhisperMessage)
	crypto.encryptMessageFor = function(deviceObject, pushMessageContent, callback) {
		var session = crypto_storage.getSession(deviceObject.encodedNumber);

		var doEncryptPushMessageContent = function(callback) {
			var msg = new WhisperMessageProtobuf();
			var plaintext = toArrayBuffer(pushMessageContent.encode());

			msg.ephemeralKey = toArrayBuffer(session.currentRatchet.ephemeralKeyPair.pubKey);
			var chain = session[getString(msg.ephemeralKey)];

			fillMessageKeys(chain, chain.counter + 1);
			var keys = HKDF(chain.messageKeys[chain.counter], '', "WhisperMessageKeys");
			delete chain.messageKeys[chain.counter];
			msg.counter = chain.counter;

			//TODO
			msg.previousCounter = 1;

			msg.ciphertext = toArrayBuffer(encryptAESCTR(plaintext, keys[0], chain.counter));
			var encodedMsg = getString(msg.encode());

			var mac = calculateMACWithVersionByte(encodedMsg, keys[1], (2 << 4) | 2);
			var result = String.fromCharCode((2 << 4) | 2) + encodedMsg + mac.substring(0, 8);

			crypto_storage.saveSession(deviceObject.encodedNumber, session);
			callback(result);
		}

		if (session === undefined) {
			var preKeyMsg = new PreKeyWhisperMessageProtobuf();
			preKeyMsg.identityKey = toArrayBuffer(crypto_storage.getStoredPubKey("identityKey"));
			createNewKeyPair(function(baseKey) {
				preKeyMsg.baseKey = toArrayBuffer(baseKey.pubKey);
				preKeyMsg.preKeyId = deviceObject.preKeyId;
				initSession(true, baseKey, deviceObject.encodedNumber, deviceObject.identityKey, deviceObject.publicKey, function() {
					//TODO: Delete preKey info now?
					session = crypto_storage.getSession(deviceObject.encodedNumber);
					//TODO: We need to step ratchet here, I think
					doEncryptPushMessageContent(function(message) {
						preKeyMsg.message = toArrayBuffer(message);
						var result = String.fromCharCode((2 << 4) | 2) + getString(preKeyMsg.encode());
						callback({type: 3, body: result});
					});
				});
			});
		} else
			doEncryptPushMessageContent(function(message) {
				callback({type: 1, body: getString(message)});
			});
	}

	var GENERATE_KEYS_KEYS_GENERATED = 100;
	crypto.generateKeys = function(callback) {
		var identityKey = crypto_storage.getStoredPubKey("identityKey");
		var identityKeyCalculated = function(pubKey) {
			identityKey = pubKey;

			var firstKeyId = storage.getEncrypted("maxPreKeyId", -1) + 1;
			storage.putEncrypted("maxPreKeyId", firstKeyId + GENERATE_KEYS_KEYS_GENERATED);

			if (firstKeyId > 16777000)
				throw "You crazy motherfucker";

			var keys = {};
			keys.keys = [];
			var keysLeft = GENERATE_KEYS_KEYS_GENERATED;
			for (var i = firstKeyId; i < firstKeyId + GENERATE_KEYS_KEYS_GENERATED; i++) {
				crypto_storage.getNewPubKeySTORINGPrivKey("preKey" + i, function(pubKey) {
					keys.keys[i] = {keyId: i, publicKey: pubKey, identityKey: identityKey};
					keysLeft--;
					if (keysLeft == 0) {
						// 0xFFFFFF == 16777215
						keys.lastResortKey = {keyId: 16777215, publicKey: crypto_storage.getStoredPubKey("preKey16777215"), identityKey: identityKey};//TODO: Rotate lastResortKey
						if (keys.lastResortKey.publicKey === undefined) {
							crypto_storage.getNewPubKeySTORINGPrivKey("preKey16777215", function(pubKey) {
								keys.lastResortKey.publicKey = pubKey;
								callback(keys);
							});
						} else
							callback(keys);
					}
				});
			}
		}
		if (identityKey === undefined)
			crypto_storage.getNewPubKeySTORINGPrivKey("identityKey", function(pubKey) { identityKeyCalculated(pubKey); });
		else
			identityKeyCalculated(pubKey);
	}

}( window.crypto = window.crypto || {}, jQuery ));

/************************************************
 *** Utilities to communicate with the server ***
 ************************************************/
var URL_BASE  = "http://textsecure-test.herokuapp.com";
var URL_CALLS = {};
URL_CALLS['accounts'] = "/v1/accounts";
URL_CALLS['devices']  = "/v1/devices";
URL_CALLS['keys']     = "/v1/keys";
URL_CALLS['push']     = "/v1/messagesocket";
URL_CALLS['messages'] = "/v1/messages/";

/**
  * REQUIRED PARAMS:
  * 	call:				URL_CALLS entry
  * 	httpType:			POST/GET/PUT/etc
  * OPTIONAL PARAMS:
  * 	success_callback:	function(response object) called on success
  * 	error_callback: 	function(http status code = -1 or != 200) called on failure
  * 	urlParameters:		crap appended to the url (probably including a leading /)
  * 	user:				user name to be sent in a basic auth header
  * 	password:			password to be sent in a basic auth headerA
  * 	do_auth:			alternative to user/password where user/password are figured out automagically
  * 	jsonData:			JSON data sent in the request body
  */
function doAjax(param) {
	if (param.urlParameters === undefined)
		param.urlParameters = "";
	if (param.do_auth) {
		param.user = storage.getUnencrypted("number_id");
		param.password = storage.getEncrypted("password");
	}
	$.ajax(URL_BASE + URL_CALLS[param.call] + param.urlParameters, {
		type: param.httpType,
		data: param.jsonData && jsonThing(param.jsonData),
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		beforeSend: function(xhr) {
			if (param.user !== undefined && param.password !== undefined)
				xhr.setRequestHeader("Authorization", "Basic " + btoa(getString(param.user) + ":" + getString(param.password)));
		},
		success: function(response, textStatus, jqXHR) {
			if (param.success_callback !== undefined)
				param.success_callback(response);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			var code = jqXHR.status;
			if (code == 200) {// happens sometimes when we get no response (TODO: Fix server to return 204? instead)
				if (param.success_callback !== undefined)
					param.success_callback(null);
				return;
			}
			if (code > 999 || code < 100)
				code = -1;
			if (param.error_callback !== undefined)
				param.error_callback(code);
		},
		cache: false
	});
}

// message_callback(decoded_protobuf) (use decodeMessage(proto))
function subscribeToPush(message_callback) {
	var user = storage.getUnencrypted("number_id");
	var password = storage.getEncrypted("password");
	var request = { url: URL_BASE + URL_CALLS['push'] + "/?user=%2B" + getString(user).substring(1) + "&password=" + getString(password),
					method: 'GET',
					fallbackMethod: 'GET',
					transport: 'websocket',
					fallbackTransport: 'websocket',
					logLevel: 'debug', //TODO
					trackMessageLength: false,
					//data: "user=" + getString(user) + "&password=" + getString(password),
					onOpen: function(response) {
						console.log('Connected to server using ' + response.transport);
					},
					onMessage: function(response) {
						try {
							// Some bug in Atmosphere.js is forcing trackMessageLength to true
							var message = JSON.parse(response.responseBody.split("|")[1]);
						} catch (e) {
							console.log('Error parsing server JSON message: ' + response.responseBody.split("|")[1]);
							return;
						}

						var proto;
						try {
							var plaintext = crypto.decryptWebsocketMessage(message.message);
							var proto = decodeIncomingPushMessageProtobuf(plaintext);
							// After this point, a) decoding errors are not the server's fault, and
							// b) we should handle them gracefully and tell the user they received an invalid message

							doAjax({call: 'push', httpType: 'PUT', urlParameters: '/' + message.id, do_auth: true});
						} catch (e) {
							console.log("Error decoding message: " + e);
							return;
						}

						try {
							crypto.handleIncomingPushMessageProto(proto, function(decrypted) {
								message_callback(decrypted);
							}); // Decrypts/decodes/fills in fields/etc
						} catch (e) {
							//TODO: Tell the user decryption failed
						}
					},
					onError: function(response) {
						console.log('Server is down :(');
						//TODO: GUI
					}};
	$.atmosphere.subscribe(request);
}

// success_callback(identity_key), error_callback(error_msg)
function getKeysForNumber(number, success_callback, error_callback) {
	doAjax({call: 'keys', httpType: 'GET', do_auth: true, urlParameters: "/" + getNumberFromString(number) + "?multikeys",
		success_callback: function(response) {
			for (var i = 0; i < response.length; i++) {
				try {
					saveDeviceObject({
						encodedNumber: number + "." + response[i].deviceId,
						identityKey: response[i].identityKey,
						publicKey: response[i].publicKey,
						preKeyId: response[i].keyId
					});
				} catch (e) {
					error_callback(e);
					return;
				}
			}
			success_callback(response[0].identityKey);
		}, error_callback: function(code) {
			error_callback("Error making HTTP request: " + code);
		}
	});
}

// success_callback(server success/failure map), error_callback(error_msg)
// message == PushMessageContentProto (NOT STRING)
function sendMessageToDevices(deviceObjectList, message, success_callback, error_callback) {
	var jsonData = [];
	for (var i = 0; i < deviceObjectList.legnth; i++) {
		var encryptedMsg = encryptMessageFor(deviceObjectList[i], message);
		jsonData[jsonData.length] = {
			type: encryptedMsg.type,
			destination: deviceObjectList[i].encodedNumber,
			body: encryptedMsg.body,
			relay: deviceObjectList[i].relay,
			timestamp: new Date().getTime()
		};
//TODO: need to encrypt with session key?
	}
	doAjax({call: 'messages', httpType: 'POST', do_auth: true, jsonData: jsonData,
		success_callback: function(result) {
			if (result.missingDeviceIds.length > 0) {
				var responsesLeft = result.missingDeviceIds.length;
				var errorThrown = 0;
				for (var i = 0; i < result.missingDeviceIds.length; i++) {
					getKeysForNumber(result.missingDeviceIds[i], function(identity_key) {
							responsesLeft--;
							if (responsesLeft == 0 && errorThrown == 0)
								sendMessageToDevices(deviceObjectList, message, success_callback, error_callback);
						}, function(error_msg) {
							errorThrown++;
							if (errorThrown == 1)
								error_callback("Failed to retreive new device keys for number " + result.missingDeviceIds[i]);
						});
				}
			} else {
				success_callback(result);
			}
		}, error_callback: function(code) {
			error_callback("Failed to conect to data channel: " + code);
		}
	});
}

// success_callback(success/failure map, see second-to-last line), error_callback(error_msg)
function sendMessageToNumbers(numbers, message, success_callback, error_callback) {
	var deviceObjectList = [];

	var deviceDatasMissing = 0;
	var loopDone = 0;
	var errorThrown = 0;
	for (var i = 0; i < numbers.length; i++) {
		var devicesForNumber = getDeviceObjectListFromNumber(numbers[i]);
		for (var j = 0; j < devicesForNumber.length; j++)
			deviceObjectList[deviceObjectList.length] = devicesForNumber[j];

		if (devicesForNumber.length == 0) {
			deviceDatasMissing++;
			getKeysForNumber(numbers[i], function(identity_key) {
					deviceDatasMissing--;
					if (deviceDatasMissing == 0 && loopDone && errorThrown == 0)
						sendMessageToNumbers(numbers, message, success_callback, error_callback);
				}, function(error_msg) {
					errorThrown++;
					if (errorThrown == 1)
						error_callback("Failed to retreive new device keys for number " + numbers[i]);
				});
		}
	}
	if (deviceDatasMissing > 0 || errorThrown > 0) {
		loopDone = 1;
		return;
	}
	return sendMessageToDevices(deviceObjectList, message, function(result) {
		var successNumbers = {};
		var failureNumbers = {};
		for (var i = 0; i < result.success; i++)
			successNumbers[getNumberFromString(result.success[i])] = 1;
		for (var i = 0; i < result.failure; i++)
			failureNumbers[getNumberFromString(result.success[i])] = 1;

		success_callback({success: successNumbers, failure: failureNumbers});
	}, error_callback);
}

function requestIdentityPrivKeyFromMasterDevice(number, identityKey) {
	sendMessageToDevices([getDeviceObject(getNumberFromString(number)) + ".1"],
						{message: "Identity Key request"}, function() {}, function() {});//TODO
}

