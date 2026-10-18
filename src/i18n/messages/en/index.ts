import * as admin from "./admin";
import * as base from "./base";
import * as drive from "./drive";
import * as billing from "./billing";
import * as design from "./design";
import * as doc from "./doc";
import * as editor from "./editor";
import * as pages from "./pages";
import * as legal from "./legal";
import * as onboarding from "./onboarding";
import * as pricing from "./pricing";
import * as screens from "./screens";

export const en = {
  ...base,
  ...screens,
  ...design,
  ...doc,
  ...editor,
  ...billing,
  ...pages,
  ...legal,
  ...pricing,
  ...onboarding,
  ...admin,
  ...drive,
};
