// ================================================
// GLOBAL VARIABLES
// ================================================
let employees = [];
let attendances = [];
let leaves = [];
let settings = {};
let currentEditId = null;

// ================================================
// TIME FORMAT UTILITY
// ================================================
function formatTime(dateString) {
    if (!dateString) return '-';
    // Karena server & DB sudah di-set timezone Asia/Jakarta,
    // langsung gunakan getHours (bukan getUTCHours)
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}.${minutes}`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Format untuk datetime-local input (tanpa konversi timezone)
function formatDateTimeLocal(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    initYearSelect();
    setCurrentMonthYear();
    loadSettings();
    showTab('dashboard');
});

function initYearSelect() {
    const yearSelect = document.getElementById('salary-year');
    const currentYear = new Date().getFullYear();

    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function setCurrentMonthYear() {
    const now = new Date();
    document.getElementById('salary-month').value = now.getMonth() + 1;
    document.getElementById('salary-year').value = now.getFullYear();
}

// ================================================
// TAB NAVIGATION
// ================================================

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remove active class from all sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('sidebar-active');
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');

    // Add active class to selected sidebar link
    const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeLink) {
        activeLink.classList.add('sidebar-active');
    }

    // Update page title
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Ringkasan data absensi' },
        employees: { title: 'Data ART', subtitle: 'Kelola data karyawan ART' },
        attendances: { title: 'Data Absensi', subtitle: 'Kelola data kehadiran' },
        leaves: { title: 'Cuti/Izin/Sakit', subtitle: 'Kelola data cuti dan izin' },
        salary: { title: 'Laporan Gaji', subtitle: 'Perhitungan gaji bulanan' },
        settings: { title: 'Pengaturan', subtitle: 'Konfigurasi sistem' }
    };

    document.getElementById('page-title').textContent = titles[tabName].title;
    document.getElementById('page-subtitle').textContent = titles[tabName].subtitle;

    // Load data for the tab
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'attendances':
            loadAttendances();
            loadEmployeesForFilter();
            break;
        case 'leaves':
            loadLeaves();
            break;
        case 'salary':
            loadEmployeesForFilter();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ================================================
// DASHBOARD
// ================================================

async function loadDashboard() {
    try {
        await loadEmployees();

        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/attendances?start_date=${today}&end_date=${today}`);
        const result = await response.json();

        if (result.success) {
            const todayAttendances = result.data;

            // Update stats
            document.getElementById('total-employees').textContent = employees.length;
            document.getElementById('present-today').textContent = todayAttendances.length;

            const workingNow = todayAttendances.filter(att => att.clock_in && !att.clock_out).length;
            document.getElementById('working-now').textContent = workingNow;

            // Render today's attendance list
            renderTodayAttendance(todayAttendances);
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat dashboard', 'error');
    }
}

function renderTodayAttendance(attendances) {
    const container = document.getElementById('today-attendance-list');

    if (!attendances || attendances.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada absensi hari ini</p>';
        return;
    }

    let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody class="bg-white divide-y divide-gray-200">';

    attendances.forEach(att => {
        const clockIn = formatTime(att.clock_in);
        const clockOut = formatTime(att.clock_out);

        let status = '';
        if (att.clock_in && att.clock_out) {
            status = '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">Selesai</span>';
        } else if (att.clock_in) {
            status = '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800">Sedang Bekerja</span>';
        }

        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="px-6 py-4 whitespace-nowrap"><div class="font-medium text-gray-900">${att.employees.name}</div></td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${clockIn}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${clockOut}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap">${status}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ================================================
// EMPLOYEES
// ================================================

async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        const result = await response.json();

        if (result.success) {
            employees = result.data;
            renderEmployees();
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat data ART', 'error');
    }
}

function renderEmployees() {
    const container = document.getElementById('employees-list');

    if (!employees || employees.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada data ART</p>';
        return;
    }

    let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telepon</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody class="bg-white divide-y divide-gray-200">';

    employees.forEach(emp => {
        const statusBadge = emp.status === 'active'
            ? '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800">Aktif</span>'
            : '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800">Non-Aktif</span>';

        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="px-6 py-4 whitespace-nowrap"><div class="font-medium text-gray-900">${emp.name}</div></td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${emp.phone || '-'}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm">`;
        html += `<button onclick="openEmployeeModal('${emp.id}')" class="text-blue-600 hover:text-blue-800 mr-3"><i class="fas fa-edit"></i></button>`;
        html += `<button onclick="deleteEmployee('${emp.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>`;
        html += `</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function openEmployeeModal(id = null) {
    currentEditId = id;
    const employee = id ? employees.find(e => e.id === id) : null;

    const modalHtml = `
        <div class="modal active" id="employee-modal">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 fade-in">
                <div class="p-6 border-b">
                    <h3 class="text-xl font-bold text-gray-800">${id ? 'Edit ART' : 'Tambah ART Baru'}</h3>
                </div>
                <form id="employee-form" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                        <input type="text" id="emp-name" value="${employee ? employee.name : ''}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">PIN (4 digit)</label>
                        <input type="text" id="emp-pin" maxlength="4" pattern="[0-9]{4}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" ${id ? 'placeholder="Kosongkan jika tidak ingin mengubah PIN"' : 'required'}>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
                        <input type="tel" id="emp-phone" value="${employee ? employee.phone || '' : ''}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select id="emp-status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="active" ${employee && employee.status === 'active' ? 'selected' : ''}>Aktif</option>
                            <option value="inactive" ${employee && employee.status === 'inactive' ? 'selected' : ''}>Non-Aktif</option>
                        </select>
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                            <i class="fas fa-save mr-2"></i>
                            Simpan
                        </button>
                        <button type="button" onclick="closeModal('employee-modal')" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold">
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHtml;

    document.getElementById('employee-form').addEventListener('submit', saveEmployee);
}

async function saveEmployee(e) {
    e.preventDefault();

    const name = document.getElementById('emp-name').value;
    const pin = document.getElementById('emp-pin').value;
    const phone = document.getElementById('emp-phone').value;
    const status = document.getElementById('emp-status').value;

    const data = { name, phone, status };

    // Validasi PIN
    if (pin) {
        if (!/^\d{4}$/.test(pin)) {
            showToast('PIN harus 4 digit angka', 'error');
            return;
        }
        data.pin = pin;
    } else if (!currentEditId) {
        showToast('PIN wajib diisi', 'error');
        return;
    }

    try {
        let response;
        if (currentEditId) {
            response = await fetch(`/api/employees/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();

        if (result.success) {
            showToast(currentEditId ? 'Data berhasil diupdate' : 'ART berhasil ditambahkan', 'success');
            closeModal('employee-modal');
            loadEmployees();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
    }
}

async function deleteEmployee(id) {
    if (!confirm('Yakin ingin menghapus ART ini? Semua data absensi akan ikut terhapus.')) {
        return;
    }

    try {
        const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showToast('ART berhasil dihapus', 'success');
            loadEmployees();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
    }
}

// ================================================
// ATTENDANCES
// ================================================

async function loadEmployeesForFilter() {
    if (employees.length === 0) {
        await loadEmployees();
    }

    // Populate employee filter
    const filterSelect = document.getElementById('filter-employee');
    const salarySelect = document.getElementById('salary-employee');

    const options = employees.map(emp =>
        `<option value="${emp.id}">${emp.name}</option>`
    ).join('');

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Semua ART</option>' + options;
    }

    if (salarySelect) {
        salarySelect.innerHTML = '<option value="">Semua ART</option>' + options;
    }
}

async function loadAttendances() {
    try {
        const response = await fetch('/api/attendances');
        const result = await response.json();

        if (result.success) {
            attendances = result.data;
            renderAttendances();
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat data absensi', 'error');
    }
}

function renderAttendances() {
    const container = document.getElementById('attendances-list');

    if (!attendances || attendances.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada data absensi</p>';
        return;
    }

    let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Jam</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody class="bg-white divide-y divide-gray-200">';

    attendances.forEach(att => {
        const date = new Date(att.date);
        const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const clockIn = formatTime(att.clock_in);
        const clockOut = formatTime(att.clock_out);
        const totalHours = att.total_hours ? `${att.total_hours} jam` : '-';

        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dateStr}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap"><div class="font-medium text-gray-900">${att.employees.name}</div></td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${clockIn}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${clockOut}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">${totalHours}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm">`;
        html += `<button onclick="openAttendanceModal('${att.id}')" class="text-blue-600 hover:text-blue-800 mr-3"><i class="fas fa-edit"></i></button>`;
        html += `<button onclick="deleteAttendance('${att.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>`;
        html += `</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function filterAttendances() {
    const employeeId = document.getElementById('filter-employee').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;

    let url = '/api/attendances?';
    if (employeeId) url += `employee_id=${employeeId}&`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}&`;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            attendances = result.data;
            renderAttendances();
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat data', 'error');
    }
}

function resetFilterAttendances() {
    document.getElementById('filter-employee').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    loadAttendances();
}

function openAttendanceModal(id = null) {
    currentEditId = id;
    const attendance = id ? attendances.find(a => a.id === id) : null;

    const employeeOptions = employees.map(emp =>
        `<option value="${emp.id}" ${attendance && attendance.employee_id === emp.id ? 'selected' : ''}>${emp.name}</option>`
    ).join('');

    const clockInDate = formatDateTimeLocal(attendance?.clock_in);
    const clockOutDate = formatDateTimeLocal(attendance?.clock_out);
    const dateValue = attendance ? attendance.date : new Date().toISOString().split('T')[0];

    const modalHtml = `
        <div class="modal active" id="attendance-modal">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 fade-in">
                <div class="p-6 border-b">
                    <h3 class="text-xl font-bold text-gray-800">${id ? 'Edit Absensi' : 'Tambah Absensi Manual'}</h3>
                </div>
                <form id="attendance-form" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">ART</label>
                        <select id="att-employee" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required ${id ? 'disabled' : ''}>
                            ${employeeOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                        <input type="date" id="att-date" value="${dateValue}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required ${id ? 'disabled' : ''}>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Clock In</label>
                        <input type="datetime-local" id="att-clock-in" value="${clockInDate}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Clock Out</label>
                        <input type="datetime-local" id="att-clock-out" value="${clockOutDate}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                        <textarea id="att-notes" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${attendance ? attendance.notes || '' : ''}</textarea>
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                            <i class="fas fa-save mr-2"></i>
                            Simpan
                        </button>
                        <button type="button" onclick="closeModal('attendance-modal')" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold">
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHtml;
    document.getElementById('attendance-form').addEventListener('submit', saveAttendance);
}

async function saveAttendance(e) {
    e.preventDefault();

    const employeeId = document.getElementById('att-employee').value;
    const date = document.getElementById('att-date').value;
    const clockIn = document.getElementById('att-clock-in').value;
    const clockOut = document.getElementById('att-clock-out').value;
    const notes = document.getElementById('att-notes').value;

    const data = {
        employee_id: employeeId,
        date,
        clock_in: clockIn || null,
        clock_out: clockOut || null,
        notes
    };

    try {
        let response;
        if (currentEditId) {
            response = await fetch(`/api/attendances/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/attendances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();

        if (result.success) {
            showToast(currentEditId ? 'Absensi berhasil diupdate' : 'Absensi berhasil ditambahkan', 'success');
            closeModal('attendance-modal');
            loadAttendances();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
    }
}

async function deleteAttendance(id) {
    if (!confirm('Yakin ingin menghapus data absensi ini?')) {
        return;
    }

    try {
        const response = await fetch(`/api/attendances/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Absensi berhasil dihapus', 'success');
            loadAttendances();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
    }
}

// ================================================
// LEAVES
// ================================================

async function loadLeaves() {
    try {
        const response = await fetch('/api/leave-records');
        const result = await response.json();

        if (result.success) {
            leaves = result.data;
            renderLeaves();
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat data cuti/izin', 'error');
    }
}

function renderLeaves() {
    const container = document.getElementById('leaves-list');

    if (!leaves || leaves.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada data cuti/izin</p>';
        return;
    }

    let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody class="bg-white divide-y divide-gray-200">';

    leaves.forEach(leave => {
        const date = new Date(leave.date);
        const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        let typeBadge = '';
        if (leave.type === 'cuti') {
            typeBadge = '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-800">Cuti</span>';
        } else if (leave.type === 'izin') {
            typeBadge = '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">Izin</span>';
        } else if (leave.type === 'sakit') {
            typeBadge = '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-200 text-red-800">Sakit</span>';
        }

        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dateStr}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap"><div class="font-medium text-gray-900">${leave.employees.name}</div></td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap">${typeBadge}</td>`;
        html += `<td class="px-6 py-4 text-sm text-gray-900">${leave.notes || '-'}</td>`;
        html += `<td class="px-6 py-4 whitespace-nowrap text-sm">`;
        html += `<button onclick="openLeaveModal('${leave.id}')" class="text-blue-600 hover:text-blue-800 mr-3"><i class="fas fa-edit"></i></button>`;
        html += `<button onclick="deleteLeave('${leave.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>`;
        html += `</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function openLeaveModal(id = null) {
    currentEditId = id;
    const leave = id ? leaves.find(l => l.id === id) : null;

    if (employees.length === 0) {
        loadEmployees();
    }

    const employeeOptions = employees.map(emp =>
        `<option value="${emp.id}" ${leave && leave.employee_id === emp.id ? 'selected' : ''}>${emp.name}</option>`
    ).join('');

    const dateValue = leave ? leave.date : new Date().toISOString().split('T')[0];

    const modalHtml = `
        <div class="modal active" id="leave-modal">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 fade-in">
                <div class="p-6 border-b">
                    <h3 class="text-xl font-bold text-gray-800">${id ? 'Edit Cuti/Izin' : 'Tambah Cuti/Izin'}</h3>
                </div>
                <form id="leave-form" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">ART</label>
                        <select id="leave-employee" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            ${employeeOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                        <input type="date" id="leave-date" value="${dateValue}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                        <select id="leave-type" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            <option value="cuti" ${leave && leave.type === 'cuti' ? 'selected' : ''}>Cuti</option>
                            <option value="izin" ${leave && leave.type === 'izin' ? 'selected' : ''}>Izin</option>
                            <option value="sakit" ${leave && leave.type === 'sakit' ? 'selected' : ''}>Sakit</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                        <textarea id="leave-notes" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${leave ? leave.notes || '' : ''}</textarea>
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                            <i class="fas fa-save mr-2"></i>
                            Simpan
                        </button>
                        <button type="button" onclick="closeModal('leave-modal')" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold">
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHtml;
    document.getElementById('leave-form').addEventListener('submit', saveLeave);
}

async function saveLeave(e) {
    e.preventDefault();

    const employeeId = document.getElementById('leave-employee').value;
    const date = document.getElementById('leave-date').value;
    const type = document.getElementById('leave-type').value;
    const notes = document.getElementById('leave-notes').value;

    const data = { employee_id: employeeId, date, type, notes };

    try {
        let response;
        if (currentEditId) {
            response = await fetch(`/api/leave-records/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/leave-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();

        if (result.success) {
            showToast(currentEditId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan', 'success');
            closeModal('leave-modal');
            loadLeaves();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
    }
}

async function deleteLeave(id) {
    if (!confirm('Yakin ingin menghapus data ini?')) {
        return;
    }

    try {
        const response = await fetch(`/api/leave-records/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Data berhasil dihapus', 'success');
            loadLeaves();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
    }
}

// ================================================
// SALARY REPORT
// ================================================

async function loadSalaryReport() {
    const employeeId = document.getElementById('salary-employee').value;
    const month = document.getElementById('salary-month').value;
    const year = document.getElementById('salary-year').value;

    let url = `/api/salary-report?year=${year}&month=${month}`;
    if (employeeId) url += `&employee_id=${employeeId}`;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            renderSalaryReport(result.data);
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat laporan gaji', 'error');
    }
}

function renderSalaryReport(data) {
    const container = document.getElementById('salary-report');

    if (!data.employees || data.employees.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Tidak ada data untuk periode ini</p>';
        return;
    }

    let html = `<div class="mb-4 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm text-gray-600">Periode: <span class="font-semibold">${new Date(data.period.start).toLocaleDateString('id-ID')} - ${new Date(data.period.end).toLocaleDateString('id-ID')}</span></p>
    </div>`;

    data.employees.forEach(emp => {
        html += `<div class="mb-6 border rounded-xl overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                <h4 class="text-xl font-bold">${emp.employee_name}</h4>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-600">Total Hari</p>
                        <p class="text-2xl font-bold text-gray-800">${emp.total_days}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-600">Total Jam</p>
                        <p class="text-2xl font-bold text-gray-800">${emp.total_hours.toFixed(2)}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-600">Jam Lembur</p>
                        <p class="text-2xl font-bold text-orange-600">${emp.total_overtime_hours.toFixed(2)}</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <p class="text-sm text-gray-600">Total Gaji</p>
                        <p class="text-2xl font-bold text-green-600">Rp ${emp.total_salary.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jam</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gaji</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">`;

        // Gabungkan attendances dan leaves, lalu sort by date
        const allRecords = [
            ...emp.attendances.map(a => ({ ...a, recordType: 'attendance' })),
            ...emp.leaves.map(l => ({ ...l, recordType: 'leave' }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        allRecords.forEach(record => {
            const date = new Date(record.date);
            const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
            const isSunday = date.getDay() === 0;

            if (record.recordType === 'attendance') {
                const hours = record.total_hours || 0;
                html += `<tr class="hover:bg-gray-50">
                    <td class="px-4 py-2">
                        <div class="font-medium">${dateStr}</div>
                        <div class="text-xs text-gray-500 ${isSunday ? 'text-red-600 font-semibold' : ''}">${dayName}</div>
                    </td>
                    <td class="px-4 py-2"><span class="px-2 py-1 text-xs rounded-full bg-green-200 text-green-800">Hadir</span></td>
                    <td class="px-4 py-2">${hours} jam</td>
                    <td class="px-4 py-2 font-semibold text-green-600">Rp ${record.salary.toLocaleString('id-ID')}</td>
                </tr>`;
            } else {
                const typeLabels = { cuti: 'Cuti', izin: 'Izin', sakit: 'Sakit' };
                const typeColors = { cuti: 'blue', izin: 'yellow', sakit: 'red' };
                const color = typeColors[record.type] || 'gray';

                html += `<tr class="hover:bg-gray-50">
                    <td class="px-4 py-2">
                        <div class="font-medium">${dateStr}</div>
                        <div class="text-xs text-gray-500 ${isSunday ? 'text-red-600 font-semibold' : ''}">${dayName}</div>
                    </td>
                    <td class="px-4 py-2"><span class="px-2 py-1 text-xs rounded-full bg-${color}-200 text-${color}-800">${typeLabels[record.type]}</span></td>
                    <td class="px-4 py-2">8 jam</td>
                    <td class="px-4 py-2 font-semibold text-green-600">Rp ${record.salary.toLocaleString('id-ID')}</td>
                </tr>`;
            }
        });

        html += `</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function exportExcel() {
    showToast('Fitur export Excel akan segera tersedia', 'info');
    // TODO: Implement Excel export
}

// ================================================
// SETTINGS
// ================================================

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const result = await response.json();

        if (result.success) {
            settings = result.data;

            // Populate form
            Object.keys(settings).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.value = settings[key];
                }
            });
        }
    } catch (error) {
        console.error(error);
        showToast('Gagal memuat pengaturan', 'error');
    }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const settingsToUpdate = [
        'office_latitude',
        'office_longitude',
        'office_radius',
        'work_start_time',
        'work_end_time',
        'daily_wage',
        'overtime_rate',
        'sunday_multiplier'
    ];

    try {
        const promises = settingsToUpdate.map(key => {
            const value = document.getElementById(key).value;
            return fetch(`/api/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });
        });

        await Promise.all(promises);

        showToast('Pengaturan berhasil disimpan', 'success');
        loadSettings();
    } catch (error) {
        console.error(error);
        showToast('Gagal menyimpan pengaturan', 'error');
    }
});

// ================================================
// UTILITY FUNCTIONS
// ================================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toast-content');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle text-2xl text-green-500';
        toastContent.className = 'bg-white rounded-lg shadow-xl p-4 max-w-sm border-l-4 border-green-500 fade-in';
    } else if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle text-2xl text-red-500';
        toastContent.className = 'bg-white rounded-lg shadow-xl p-4 max-w-sm border-l-4 border-red-500 fade-in';
    } else if (type === 'warning') {
        toastIcon.className = 'fas fa-exclamation-triangle text-2xl text-yellow-500';
        toastContent.className = 'bg-white rounded-lg shadow-xl p-4 max-w-sm border-l-4 border-yellow-500 fade-in';
    } else {
        toastIcon.className = 'fas fa-info-circle text-2xl text-blue-500';
        toastContent.className = 'bg-white rounded-lg shadow-xl p-4 max-w-sm border-l-4 border-blue-500 fade-in';
    }

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}
