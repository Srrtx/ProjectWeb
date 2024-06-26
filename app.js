const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const con = require("./config/db");
const cors = require("cors");
const { connect } = require("http2");

const app = express();
app.use(cors());
app.use(express.json());

// set the public folder
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// for session
app.use(
  session({
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, //1 day in millisec
    secret: "mysecretcode",
    resave: false,
    saveUninitialized: true,
    // config MemoryStore here
    store: new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000, // prune expired entries every 24h
    }),
  })
);
// root sever
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/view/login.html"));
});

app.get("/homeuser", function (req, res) {
  res.sendFile(path.join(__dirname, "HomepageUser.html"));
});
app.get("/dashboard", function (req, res) {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});
app.get("/home", function (req, res) {
  res.sendFile(path.join(__dirname, "homepage.html"));
});
app.get("/homestaff", function (req, res) {
  res.sendFile(path.join(__dirname, "HomepageStaff.html"));
});

// ============ User routes ==============
// Endpoint to fetch room details based on ordering_id
app.get("/room/:orderingID", function (req, res) {
  const sql =
    "SELECT room.room_id, room.time_slot,room.room_name, room.status FROM room INNER JOIN booking ON room.room_id = booking.room_id WHERE booking.ordering_id = ?";
  con.query(sql, [req.params.orderingID], function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});
// Endpoint to get orders and order details for a specific user
app.get("/user/order", function (req, res) {
  const sql = "SELECT * FROM ordering WHERE user_id=?";
  con.query(sql, [req.session.userID], function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});

// Request to book a room, time slot, write details
app.post("/user/booking", function (req, res) {
  const bookingSql =
    "INSERT INTO Bookings (user_id, room_id, date, time_slot, status) VALUES ?";
  const bookingValues = rooms.map((room) => {
    return [
      req.session.userID,
      room.room_id,
      room.date,
      room.time_slot,
      "Pending",
    ];
  });

  con.query(bookingSql, [bookingValues], function (err, bookingResult) {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to create booking");
    }

    // Check the number of inserted rows in `Bookings` table
    if (bookingResult.affectedRows !== rooms.length) {
      // Handle partial insertion or unexpected behavior
      return res.status(500).send("Failed to book all rooms");
    }

    // Successful booking
    res.send("Rooms booked successfully");
  });
});

// Endpoint to fetch active products
app.get("/user/product", function (req, res) {
  const sql = "SELECT * FROM product WHERE status=1";

  con.query(sql, function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }

    // Return the list of active products in JSON format
    res.json(results);
  });
});

// app.post("/user/bookings", function (req, res, next) {
//   const sql = `
//     INSERT INTO bookings
//       (booking_id, room_id, user_id, date, time_slot, status, approver_id)
//     VALUES
//       (?, ?, ?, CURRENT_DATE(), ?, ?, ?)
//   `;
//   const values = [
//     req.body.booking_id,
//     req.body.room_id,
//     req.body.user_id,
//     req.body.date,
//     req.body.time_slot,
//     req.body.status,
//     req.body.approver_id,
//   ];
//   connect.query(sql, values, function (err, result) {
//     if (err) {
//       console.error("Error inserting booking:", err); // Log the error message
//       return res.status(500).json({ error: "Failed to insert booking" });
//     }

//     // Return the inserted booking result
//     res.json(result);
//   });
// });

app.post("/user/bookings", function (req, res, next) {
  const { booking_id, room_id, user_id, date, time_slot, status, approver_id } = req.body;

  // Validate required fields
  if (!booking_id || !room_id || !user_id || !date || !time_slot || !status || !approver_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate data types
  if (typeof booking_id !== "number" || typeof room_id !== "number" || typeof user_id !== "number" || typeof approver_id !== "number") {
    return res.status(400).json({ error: "Invalid data types for numeric fields" });
  }

  // Perform database insertion
  const sql = `
    INSERT INTO bookings 
      (booking_id, room_id, user_id, date, time_slot, status, approver_id) 
    VALUES 
      (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [booking_id, room_id, user_id, date, time_slot, status, approver_id];

  connection.query(sql, values, function (err, results) {
    if (err) {
      console.error("Error inserting booking:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Successful insertion
    res.status(201).json({ message: "Booking created successfully", booking: results });
  });
});



app.get("/Register", function (req, res) {
  res.sendFile(path.join(__dirname, "Registor.html"));
});

app.post("/Register1", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  // -------GenerateID--------
  function generateID() {
    let id = "";
    const digits = "0123456789";
    for (let i = 0; i < 11; i++) {
      id += digits[Math.floor(Math.random() * 9)];
    }
    return id;
  }

  // ------------- Create hashed password --------------
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // 10 คือค่าความปลอดภัยของการเข้ารหัส : 10 salt

    // ตรวจสอบว่า username มีอยู่ในฐานข้อมูลแล้วหรือไม่
    // check username in database
    const checkUsernameQuery = "SELECT * FROM users WHERE Username = ?";
    con.query(checkUsernameQuery, [username], async function (err, result) {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error checking username");
      }

      if (result.length > 0) {
        console.log("Username already exists:", username);
        return res.status(400).send("Username already exists");
      }

      // ถ้า username ยังไม่มีในฐานข้อมูล ก็ทำการลงทะเบียน
      // if username did not have in database --> jump to register
      const sql =
        "INSERT INTO users (ID, Firstname, Lastname, Username, Password, Role) VALUES (?, ?, ?, ?, ?, ?)";
      const id = generateID();
      const firstname = req.body.firstname;
      const lastname = req.body.lastname;
      const role = 1;

      con.query(
        sql,
        [id, firstname, lastname, username, hashedPassword, role],
        function (err, result) {
          if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Error registering user");
          }
          console.log("User registered successfully");
          res.send("Registered successfully");
        }
      );
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).send("Error hashing password");
  }
});

// ---------Login-----------
app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  const sql = "SELECT user_id, role, password FROM users WHERE Username=?";
  con.query(sql, [username], async function (err, results) {
    if (err) {
      console.error(err);
      res.status(500).send("Server error");
    } else {
      if (results.length === 0) {
        res.status(401).send("Login failed: username or password is wrong");
      } else {
        const hashedPassword = results[0].password;
        try {
          const match = await bcrypt.compare(password, hashedPassword);
          if (match) {
            // Redirect URL on successful login
            res.status(200).send("/HomepageUser.html");
          } else {
            res.status(401).send("Login failed: username or password is wrong");
          }
        } catch (error) {
          console.error("Error comparing passwords:", error);
          res.status(500).send("Error comparing passwords");
        }
      }
    }
  });
});

// ------------- Logout --------------
app.get("/logout", function (req, res) {
  //clear session variable
  req.session.destroy(function (err) {
    if (err) {
      console.error(err);
      res.status(500).send("Cannot clear session");
    } else {
      res.redirect("/");
    }
  });
});

// **config
// start sever
const PORT = 3000;
app.listen(PORT, function () {
  console.log("Server is running at port " + PORT);
});
