const Koa = require("koa");
const Router = require("@koa/router");
const {
  Encoding,
  Field,
  Poseidon,
  PrivateKey,
  Signature,
  isReady,
} = require("snarkyjs");

const PORT = process.env.PORT || 3000;

const app = new Koa();
const router = new Router();

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

async function getSignedBioAuthId(_payload) {
  // We need to wait for SnarkyJS to finish loading before we can do anything
  await isReady;

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

router.get("/:id", async (ctx) => {
  ctx.body = await getSignedBioAuthId(ctx.params.id);
  console.log(`/${ctx.params.id} --> ${ctx.body.data.bioAuthId}`);
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT);
