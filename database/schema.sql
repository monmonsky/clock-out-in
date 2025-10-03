-- ================================================
-- SCHEMA DATABASE UNTUK SISTEM ABSENSI ART
-- ================================================

-- Table: employees (Data ART)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    pin VARCHAR(255) NOT NULL, -- Encrypted PIN 4 digit
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: attendances (Data Absensi)
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    clock_in_latitude DECIMAL(10, 8),
    clock_in_longitude DECIMAL(11, 8),
    clock_out_latitude DECIMAL(10, 8),
    clock_out_longitude DECIMAL(11, 8),
    notes TEXT,
    total_hours DECIMAL(5, 2), -- Calculated on clock out
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Table: leave_records (Data Cuti/Izin/Sakit)
CREATE TABLE IF NOT EXISTS leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL, -- cuti, izin, sakit
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: settings (Konfigurasi Sistem)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings untuk GPS lokasi kantor
INSERT INTO settings (key, value, description) VALUES
    ('office_latitude', '0', 'Latitude lokasi kantor'),
    ('office_longitude', '0', 'Longitude lokasi kantor'),
    ('office_radius', '500', 'Radius validasi GPS dalam meter'),
    ('work_start_time', '08:00', 'Jam mulai kerja'),
    ('work_end_time', '17:00', 'Jam selesai kerja'),
    ('daily_wage', '100000', 'Gaji per hari (9 jam)'),
    ('overtime_rate', '11000', 'Rate lembur per jam'),
    ('sunday_multiplier', '2', 'Multiplier gaji hari Minggu')
ON CONFLICT (key) DO NOTHING;

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_attendances_employee_date ON attendances(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_leave_records_employee_date ON leave_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Function untuk auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers untuk auto update updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
