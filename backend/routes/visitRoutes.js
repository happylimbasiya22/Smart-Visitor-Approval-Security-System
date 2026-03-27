const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/authMiddleware");

const {
  createVisit,
  createExpectedVisit,
  getVisitsByFlat,
  getVisitById,
  approveVisit,
  rejectVisit,
  guardArriveVisit,
  getAdminStats,
  getAdminVisits,
  getGuardDashboard,
  getNotifications,
  getGlobalVisits
} = require("../controllers/visitController");

router.post("/visit", authenticate, authorize("guard"), createVisit);
router.post("/visit/expected", authenticate, authorize("resident"), createExpectedVisit);
router.get("/visits/global", authenticate, getGlobalVisits);
router.get("/visits/:flat_id", authenticate, authorize("resident"), getVisitsByFlat);
router.get("/visits/:flat_id/history", authenticate, authorize("resident"), getVisitsByFlat);
router.get("/visit/:id", authenticate, getVisitById);
router.put("/visit/:id/approve", authenticate, authorize("resident"), approveVisit);
router.put("/visit/:id/reject", authenticate, authorize("resident"), rejectVisit);
router.put("/visit/:id/arrive", authenticate, authorize("guard"), guardArriveVisit);
router.get("/admin/stats", authenticate, authorize("admin"), getAdminStats);
router.get("/admin/visits", authenticate, authorize("admin"), getAdminVisits);
router.get("/guard/dashboard", authenticate, authorize("guard"), getGuardDashboard);
router.get("/notifications", authenticate, getNotifications);

module.exports = router;