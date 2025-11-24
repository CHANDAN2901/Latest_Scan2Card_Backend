import { createExhibitor } from "../src/controllers/admin.controller";
import * as authService from "../src/services/auth.service";

jest.mock("../src/services/auth.service", () => ({
  registerUser: jest.fn(),
}));

const mockedRegisterUser = authService.registerUser as jest.Mock;

const createMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("createExhibitor controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates exhibitor with auto-generated password when none supplied", async () => {
    mockedRegisterUser.mockResolvedValue({
      _id: "user_123",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      roleName: "EXHIBITOR",
    });

    const req: any = {
      body: {
        firstName: "Jane",
        lastName: "Doe",
        email: "Jane@example.com",
        phoneNumber: "+1234567890",
        companyName: "Acme Corp",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    await createExhibitor(req, res, next);

    expect(mockedRegisterUser).toHaveBeenCalledWith(
      expect.objectContaining({
        roleName: "EXHIBITOR",
        password: expect.any(String),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "jane@example.com" }),
        temporaryPassword: expect.any(String),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when mandatory fields are missing", async () => {
    const req: any = { body: { firstName: "Jane" } };
    const res = createMockRes();
    const next = jest.fn();

    await createExhibitor(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Missing required field"),
      })
    );
    expect(mockedRegisterUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
