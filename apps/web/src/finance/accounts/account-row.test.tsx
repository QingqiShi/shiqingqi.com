import { describe, expect, it } from "vitest";
import { render } from "#src/testing/test-utils.tsx";
import type { AccountRow as AccountRowData } from "../sync/row-schemas.ts";
import { testAccount } from "../transactions/testing/create-test-replica.ts";
import { AccountRow } from "./account-row.tsx";

function renderRow(account: AccountRowData) {
  return render(
    <ul>
      <AccountRow
        form="card"
        line={{
          account,
          balance: 0,
          baseBalance: 0,
          hidden: null,
          ownerName: null,
          lastValuationOn: null,
          available: null,
          bankLink: null,
          balanceCheck: null,
        }}
        baseCurrency="GBP"
        href="/finance?account=current"
        isSelected={false}
        initials="CA"
      />
    </ul>,
  );
}

describe("AccountRow", () => {
  it("shows the icon of the account's institution over its initials", () => {
    const { container } = renderRow(
      testAccount("current", {
        name: "Current Account",
        institution: "Natwest",
        guessedInstitutionDomain: "natwest.com",
        institutionIconVersion: "a4922319670fa6ae",
      }),
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/api/finance/institution-icons/natwest.com?v=a4922319670fa6ae",
    );
    expect(container).toHaveTextContent("CA");
  });

  it("shows only the initials when the server has no icon", () => {
    const { container } = renderRow(
      testAccount("current", {
        name: "Current Account",
        institution: "Natwest",
        guessedInstitutionDomain: "natwest.com",
      }),
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("CA");
  });
});
