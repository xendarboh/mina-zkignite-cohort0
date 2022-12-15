import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import { payloadFromBase58 } from "snarky-bioauth";
import {
  Encoding,
  Field,
  Poseidon,
  PrivateKey,
  Signature,
  isReady,
} from "snarkyjs";

const PORT = process.env.PORT || 3000;

const app = new Koa();
const router = new Router();

// catch errors for more tidy console output
// https://github.com/koajs/koa/wiki/Error-Handling#catching-downstream-errors
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
    // ctx.app.emit("error", err, ctx);
    console.log(`[${ctx.status}] ${ctx.path}`);
  }
});

app.use(cors());

// simulate authenticated biometric identifiers
const bioAuthIds = [
  "bF1Hk36PrzBIY2AxSQT0",
  "5F1jP3ASmlBpX2Sf3Qy0",
  "HF1Fy3sz51BY62rlXQ50",
  "3F1KA3AphJBuJ2o3fQJ0",
  "pF14A3T7TRBDq2wkGQG0",
  "KF1wl35NGyBAY2U0jQd0",
  "8F1p13m01ABpr2ZAAQs0",
  "3F1p73MkvoB2v2QNKQP0",
  "cF1NQ33gMZBZ22TrrQS0",
  "iF1yT3hooSB5e2dRFQU0",
  "JF1DF3h1EmBpz2jtuQ40",
  "XF1yG3e7PZBD52dsqQS0",
  "SF1sb3dpv0BDl2j89QY0",
  "WF1a1362WBBbT2FHsQ90",
];
const getBioAuthId = (x) => bioAuthIds[x % bioAuthIds.length];

async function getSignedBioAuthId(id) {
  // We need to wait for SnarkyJS to finish loading before we can do anything
  await isReady;

  const _payload = payloadFromBase58(id);

  // The private key of our account. When running locally the hardcoded key will
  // be used. In production the key will be loaded from a Vercel environment
  // variable.
  const privateKey = PrivateKey.fromBase58(
    process.env.PRIVATE_KEY ??
      "EKFALuhuMgHMoxVb3mwKS3Zx5yL9kg5TawbBoQaDq6bWqNE2GGBP"
  );

  // Compute the public key associated with our private key
  const publicKey = privateKey.toPublicKey();

  // Define a Field with the value of the payload
  const payload = Field(_payload);

  // Define a Field with the current timestamp
  const timestamp = Field(Date.now());

  // Define a Field with the users bioAuthId
  const bioAuthId = Poseidon.hash(
    Encoding.stringToFields(getBioAuthId(_payload))
  );

  // Use our private key to sign an array of Fields containing the data
  const signature = Signature.create(privateKey, [
    payload,
    timestamp,
    bioAuthId,
  ]);

  return {
    data: { payload, timestamp, bioAuthId },
    signature,
    publicKey,
  };
}

// for non-interactive tests
router.get("/:id", async (ctx) => {
  const id = ctx.params.id;
  ctx.body = await getSignedBioAuthId(id);
  console.log(`/${id} --> ${ctx.body.data.bioAuthId}`);
});

// an in-memory store of bioauthenticated payloads
const signedBioAuths = {};

// for simulating interactive requests
// more closely resembles deployed non-test oracle
router.get("/mina/:id", async (ctx) => {
  const id = ctx.params.id;
  if (signedBioAuths[id]) {
    ctx.body = signedBioAuths[id];
    console.log(`[200] /mina/${id} --> ${ctx.body.data.bioAuthId}`);
  } else {
    ctx.status = 404;
    ctx.body = { error: "404" };
    console.log(`[404] /mina/${id}`);
  }
});

router.get("/mina/auth/:id", async (ctx) => {
  const id = ctx.params.id;
  const signed = await getSignedBioAuthId(id);
  signedBioAuths[id] = signed;
  ctx.body = signedBioAuths[id];
  console.log(`[200] /mina/auth/${id} --> ${signed.data.bioAuthId}`);
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT);
