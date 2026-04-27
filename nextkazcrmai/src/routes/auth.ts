import { Router, type RequestHandler } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { User } from "../models/User";
import { auth } from "../middleware/auth";

const SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const TOKEN_TTL: SignOptions["expiresIn"] = "30d";

const router = Router();

const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email и пароль обязательны" });
      return;
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }
    const token = jwt.sign({ id: String(user._id) }, SECRET, { expiresIn: TOKEN_TTL });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

const me: RequestHandler = (req, res) => {
  const u = req.user!;
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role } });
};

router.post("/login", login);
router.get("/me", auth, me);

export default router;
