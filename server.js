require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate Limiting untuk prevent brute force
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100 // limit 100 requests per windowMs
});
app.use('/api/', limiter);

// ================================================
// UTILITY FUNCTIONS
// ================================================

// Haversine formula untuk menghitung jarak GPS
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Jarak dalam meter
}

// Hitung total jam kerja
function calculateWorkHours(clockIn, clockOut) {
    const diff = new Date(clockOut) - new Date(clockIn);
    return diff / (1000 * 60 * 60); // Convert ke jam
}

// Cek apakah hari Minggu
function isSunday(date) {
    return new Date(date).getDay() === 0;
}

// Hitung gaji
function calculateSalary(totalHours, date, dailyWage = 100000, overtimeRate = 11000, sundayMultiplier = 2) {
    const baseHours = 9; // Minimal 9 jam kerja
    const sunday = isSunday(date);
    const multiplier = sunday ? sundayMultiplier : 1;

    let salary = 0;

    if (totalHours <= baseHours) {
        salary = dailyWage * multiplier;
    } else {
        const overtimeHours = totalHours - baseHours;
        salary = (dailyWage * multiplier) + (overtimeHours * overtimeRate * multiplier);
    }

    return Math.round(salary);
}

// Get periode absensi (29 bulan lalu - 28 bulan ini)
function getAttendancePeriod(currentDate = new Date()) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    let startDate, endDate;

    if (day >= 29) {
        // Jika tanggal >= 29, periode dari 29 bulan ini s/d 28 bulan depan
        startDate = new Date(year, month, 29);
        endDate = new Date(year, month + 1, 28);
    } else {
        // Jika tanggal < 29, periode dari 29 bulan lalu s/d 28 bulan ini
        startDate = new Date(year, month - 1, 29);
        endDate = new Date(year, month, 28);
    }

    return { startDate, endDate };
}

// ================================================
// API ROUTES - SETTINGS
// ================================================

// Get all settings
app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;

        // Convert to object
        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update setting
app.put('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const { data, error } = await supabase
            .from('settings')
            .update({ value })
            .eq('key', key)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================
// API ROUTES - EMPLOYEES
// ================================================

// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create employee
app.post('/api/employees', async (req, res) => {
    try {
        const { name, pin, phone, status } = req.body;

        // Hash PIN
        const hashedPin = await bcrypt.hash(pin, 10);

        const { data, error } = await supabase
            .from('employees')
            .insert([{ name, pin: hashedPin, phone, status: status || 'active' }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, pin, phone, status } = req.body;

        const updateData = { name, phone, status };

        // Jika ada PIN baru, hash
        if (pin) {
            updateData.pin = await bcrypt.hash(pin, 10);
        }

        const { data, error } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify PIN
app.post('/api/employees/verify-pin', async (req, res) => {
    try {
        const { pin } = req.body;

        // Get all active employees
        const { data: employees, error } = await supabase
            .from('employees')
            .select('*')
            .eq('status', 'active');

        if (error) throw error;

        // Cek PIN untuk setiap employee
        for (const employee of employees) {
            const match = await bcrypt.compare(pin, employee.pin);
            if (match) {
                // Hapus PIN dari response
                delete employee.pin;
                return res.json({ success: true, data: employee });
            }
        }

        res.status(401).json({ success: false, message: 'PIN tidak valid' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================
// API ROUTES - ATTENDANCES
// ================================================

// Get attendances dengan filter
app.get('/api/attendances', async (req, res) => {
    try {
        const { employee_id, start_date, end_date } = req.query;

        let query = supabase
            .from('attendances')
            .select(`
                *,
                employees (
                    id,
                    name,
                    phone
                )
            `)
            .order('date', { ascending: false });

        if (employee_id) {
            query = query.eq('employee_id', employee_id);
        }

        if (start_date) {
            query = query.gte('date', start_date);
        }

        if (end_date) {
            query = query.lte('date', end_date);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get attendance by employee and date
app.get('/api/attendances/:employee_id/:date', async (req, res) => {
    try {
        const { employee_id, date } = req.params;

        const { data, error } = await supabase
            .from('attendances')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('date', date)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({ success: true, data: data || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Clock In
app.post('/api/attendances/clock-in', async (req, res) => {
    try {
        const { employee_id, latitude, longitude, notes } = req.body;

        // Get settings
        const { data: settingsData } = await supabase.from('settings').select('*');
        const settings = {};
        settingsData.forEach(item => { settings[item.key] = item.value; });

        // Validasi GPS
        const distance = calculateDistance(
            parseFloat(settings.office_latitude),
            parseFloat(settings.office_longitude),
            latitude,
            longitude
        );

        if (distance > parseFloat(settings.office_radius)) {
            return res.status(400).json({
                success: false,
                message: `Anda berada ${Math.round(distance)}m dari lokasi kantor. Maksimal ${settings.office_radius}m`
            });
        }

        const today = new Date().toISOString().split('T')[0];

        // Cek apakah sudah clock in hari ini
        const { data: existing } = await supabase
            .from('attendances')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('date', today)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah clock in hari ini'
            });
        }

        // Insert clock in
        // Supabase sudah handle timezone Asia/Jakarta, jadi langsung pakai new Date()
        const { data, error } = await supabase
            .from('attendances')
            .insert([{
                employee_id,
                date: today,
                clock_in: new Date().toISOString(),
                clock_in_latitude: latitude,
                clock_in_longitude: longitude,
                notes
            }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0], message: 'Clock in berhasil!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Clock Out
app.post('/api/attendances/clock-out', async (req, res) => {
    try {
        const { employee_id, latitude, longitude, notes } = req.body;

        // Get settings
        const { data: settingsData } = await supabase.from('settings').select('*');
        const settings = {};
        settingsData.forEach(item => { settings[item.key] = item.value; });

        // Validasi GPS
        const distance = calculateDistance(
            parseFloat(settings.office_latitude),
            parseFloat(settings.office_longitude),
            latitude,
            longitude
        );

        if (distance > parseFloat(settings.office_radius)) {
            return res.status(400).json({
                success: false,
                message: `Anda berada ${Math.round(distance)}m dari lokasi kantor. Maksimal ${settings.office_radius}m`
            });
        }

        const today = new Date().toISOString().split('T')[0];

        // Cek apakah sudah clock in
        const { data: attendance } = await supabase
            .from('attendances')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('date', today)
            .single();

        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'Anda belum clock in hari ini'
            });
        }

        if (attendance.clock_out) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah clock out hari ini'
            });
        }

        // Hitung total hours
        const clockInTime = new Date(attendance.clock_in);
        const clockOutTime = new Date();
        const totalHours = calculateWorkHours(clockInTime, clockOutTime);

        // Debug info
        console.log('Clock In DB:', attendance.clock_in);
        console.log('Clock In parsed:', clockInTime.toString());
        console.log('Clock Out Time:', clockOutTime.toString());
        console.log('Total Hours:', totalHours);

        // Validasi minimal jam kerja (9 jam)
        const minWorkHours = 9;
        if (totalHours < minWorkHours) {
            const remainingHours = minWorkHours - totalHours;
            const hours = Math.floor(remainingHours);
            const minutes = Math.round((remainingHours - hours) * 60);

            // Hitung waktu minimal yang harus dicapai (9 jam dari clock in)
            const minimumClockOut = new Date(clockInTime.getTime() + (minWorkHours * 60 * 60 * 1000));
            const minHour = String(minimumClockOut.getHours()).padStart(2, '0');
            const minMinute = String(minimumClockOut.getMinutes()).padStart(2, '0');

            return res.status(400).json({
                success: false,
                message: `Belum bisa clock out. Minimal ${minWorkHours} jam kerja. Bisa clock out jam ${minHour}:${minMinute}. Sisa waktu: ${hours} jam ${minutes} menit`
            });
        }

        // Update clock out
        const updateData = {
            clock_out: clockOutTime.toISOString(),
            clock_out_latitude: latitude,
            clock_out_longitude: longitude,
            total_hours: totalHours.toFixed(2)
        };

        if (notes) {
            updateData.notes = attendance.notes ? `${attendance.notes}\n${notes}` : notes;
        }

        const { data, error } = await supabase
            .from('attendances')
            .update(updateData)
            .eq('id', attendance.id)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0], message: 'Clock out berhasil!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create attendance (manual by admin)
app.post('/api/attendances', async (req, res) => {
    try {
        const { employee_id, date, clock_in, clock_out, notes } = req.body;

        let total_hours = null;
        if (clock_in && clock_out) {
            total_hours = calculateWorkHours(clock_in, clock_out).toFixed(2);
        }

        const { data, error } = await supabase
            .from('attendances')
            .insert([{
                employee_id,
                date,
                clock_in,
                clock_out,
                total_hours,
                notes
            }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update attendance (by admin)
app.put('/api/attendances/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { clock_in, clock_out, notes } = req.body;

        const updateData = { notes };

        if (clock_in) updateData.clock_in = clock_in;
        if (clock_out) updateData.clock_out = clock_out;

        if (clock_in && clock_out) {
            updateData.total_hours = calculateWorkHours(clock_in, clock_out).toFixed(2);
        }

        const { data, error } = await supabase
            .from('attendances')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete attendance
app.delete('/api/attendances/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('attendances')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Attendance deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================
// API ROUTES - LEAVE RECORDS
// ================================================

// Get leave records
app.get('/api/leave-records', async (req, res) => {
    try {
        const { employee_id, start_date, end_date } = req.query;

        let query = supabase
            .from('leave_records')
            .select(`
                *,
                employees (
                    id,
                    name
                )
            `)
            .order('date', { ascending: false });

        if (employee_id) {
            query = query.eq('employee_id', employee_id);
        }

        if (start_date) {
            query = query.gte('date', start_date);
        }

        if (end_date) {
            query = query.lte('date', end_date);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create leave record
app.post('/api/leave-records', async (req, res) => {
    try {
        const { employee_id, date, type, notes } = req.body;

        const { data, error } = await supabase
            .from('leave_records')
            .insert([{ employee_id, date, type, notes }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update leave record
app.put('/api/leave-records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, notes } = req.body;

        const { data, error } = await supabase
            .from('leave_records')
            .update({ type, notes })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete leave record
app.delete('/api/leave-records/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('leave_records')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Leave record deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================
// API ROUTES - SALARY REPORT
// ================================================

// Get salary report
app.get('/api/salary-report', async (req, res) => {
    try {
        const { employee_id, year, month } = req.query;

        // Hitung periode (29 bulan lalu - 28 bulan ini)
        const currentDate = new Date(year, month - 1, 15); // Tanggal tengah bulan
        const { startDate, endDate } = getAttendancePeriod(currentDate);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Get settings
        const { data: settingsData } = await supabase.from('settings').select('*');
        const settings = {};
        settingsData.forEach(item => { settings[item.key] = item.value; });

        // Get attendances
        let query = supabase
            .from('attendances')
            .select(`
                *,
                employees (
                    id,
                    name
                )
            `)
            .gte('date', startDateStr)
            .lte('date', endDateStr);

        if (employee_id) {
            query = query.eq('employee_id', employee_id);
        }

        const { data: attendances, error: attendanceError } = await query;
        if (attendanceError) throw attendanceError;

        // Get leave records
        let leaveQuery = supabase
            .from('leave_records')
            .select(`
                *,
                employees (
                    id,
                    name
                )
            `)
            .gte('date', startDateStr)
            .lte('date', endDateStr);

        if (employee_id) {
            leaveQuery = leaveQuery.eq('employee_id', employee_id);
        }

        const { data: leaveRecords, error: leaveError } = await leaveQuery;
        if (leaveError) throw leaveError;

        // Group by employee
        const employeeMap = {};

        // Process attendances
        attendances.forEach(att => {
            const empId = att.employee_id;
            if (!employeeMap[empId]) {
                employeeMap[empId] = {
                    employee_id: empId,
                    employee_name: att.employees.name,
                    total_days: 0,
                    total_hours: 0,
                    total_overtime_hours: 0,
                    total_salary: 0,
                    attendances: [],
                    leaves: []
                };
            }

            if (att.total_hours) {
                const hours = parseFloat(att.total_hours);
                const salary = calculateSalary(
                    hours,
                    att.date,
                    parseFloat(settings.daily_wage),
                    parseFloat(settings.overtime_rate),
                    parseFloat(settings.sunday_multiplier)
                );

                employeeMap[empId].total_days++;
                employeeMap[empId].total_hours += hours;
                employeeMap[empId].total_overtime_hours += Math.max(0, hours - 8);
                employeeMap[empId].total_salary += salary;
                employeeMap[empId].attendances.push({
                    ...att,
                    salary
                });
            }
        });

        // Process leaves (tetap dapat gaji)
        leaveRecords.forEach(leave => {
            const empId = leave.employee_id;
            if (!employeeMap[empId]) {
                employeeMap[empId] = {
                    employee_id: empId,
                    employee_name: leave.employees.name,
                    total_days: 0,
                    total_hours: 0,
                    total_overtime_hours: 0,
                    total_salary: 0,
                    attendances: [],
                    leaves: []
                };
            }

            const salary = calculateSalary(
                8,
                leave.date,
                parseFloat(settings.daily_wage),
                parseFloat(settings.overtime_rate),
                parseFloat(settings.sunday_multiplier)
            );

            employeeMap[empId].total_days++;
            employeeMap[empId].total_hours += 8;
            employeeMap[empId].total_salary += salary;
            employeeMap[empId].leaves.push({
                ...leave,
                salary
            });
        });

        const report = Object.values(employeeMap);

        res.json({
            success: true,
            data: {
                period: {
                    start: startDateStr,
                    end: endDateStr
                },
                employees: report
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================================
// START SERVER
// ================================================

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
