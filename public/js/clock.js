// ================================================
// GLOBAL VARIABLES
// ================================================
let currentEmployee = null;
let currentAttendance = null;

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

// ================================================
// CLOCK FUNCTIONS
// ================================================

function updateClock() {
    // Get current WIB time (for display to users)
    const now = new Date();

    // Update time in WIB (Asia/Jakarta)
    const wibTime = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12: false
    });
    document.getElementById('current-time').textContent = wibTime;

    // Update date
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta'
    };
    const dateStr = now.toLocaleDateString('id-ID', options);
    document.getElementById('current-date').textContent = dateStr;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock();

// ================================================
// PIN INPUT FUNCTIONS
// ================================================

// Auto focus next input
document.querySelectorAll('.pin-input').forEach((input, index, inputs) => {
    input.addEventListener('input', (e) => {
        const value = e.target.value;

        // Only allow numbers
        if (!/^\d*$/.test(value)) {
            e.target.value = '';
            return;
        }

        // Add filled class
        if (value) {
            e.target.classList.add('filled');
            // Auto focus next
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            } else {
                // Last input, auto verify
                verifyPin();
            }
        } else {
            e.target.classList.remove('filled');
        }
    });

    // Handle backspace
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
        }
    });

    // Prevent paste
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim();
        if (/^\d{4}$/.test(pasteData)) {
            // Valid 4-digit paste
            inputs.forEach((inp, i) => {
                inp.value = pasteData[i];
                inp.classList.add('filled');
            });
            verifyPin();
        }
    });
});

// Focus first input on load
document.getElementById('pin1').focus();

function clearPin() {
    document.querySelectorAll('.pin-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
    document.getElementById('pin1').focus();
}

async function verifyPin() {
    const pin1 = document.getElementById('pin1').value;
    const pin2 = document.getElementById('pin2').value;
    const pin3 = document.getElementById('pin3').value;
    const pin4 = document.getElementById('pin4').value;

    const pin = pin1 + pin2 + pin3 + pin4;

    if (pin.length !== 4) {
        showToast('Masukkan 4 digit PIN', 'error');
        return;
    }

    // Admin PIN - redirect to admin dashboard
    if (pin === '0509') {
        window.location.href = '/admin.html';
        return;
    }

    try {
        const response = await fetch('/api/employees/verify-pin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin })
        });

        const result = await response.json();

        if (result.success) {
            currentEmployee = result.data;
            showEmployeeSection();
            await loadTodayAttendance();
            await loadAttendanceHistory();
        } else {
            showToast(result.message || 'PIN tidak valid', 'error');
            clearPin();
        }
    } catch (error) {
        showToast('Terjadi kesalahan. Coba lagi.', 'error');
        console.error(error);
    }
}

// ================================================
// EMPLOYEE SECTION
// ================================================

function showEmployeeSection() {
    document.getElementById('pin-section').classList.add('hidden');
    document.getElementById('employee-section').classList.remove('hidden');

    // Set employee info
    const initial = currentEmployee.name.charAt(0).toUpperCase();
    document.getElementById('employee-initial').textContent = initial;
    document.getElementById('employee-name').textContent = currentEmployee.name;
    document.getElementById('employee-phone').textContent = currentEmployee.phone || '-';
}

function logout() {
    currentEmployee = null;
    currentAttendance = null;
    document.getElementById('employee-section').classList.add('hidden');
    document.getElementById('pin-section').classList.remove('hidden');
    document.getElementById('notes').value = '';
    clearPin();
}

// ================================================
// ATTENDANCE FUNCTIONS
// ================================================

async function loadTodayAttendance() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/attendances/${currentEmployee.id}/${today}`);
        const result = await response.json();

        if (result.success && result.data) {
            currentAttendance = result.data;
            updateAttendanceUI();
        } else {
            currentAttendance = null;
            updateAttendanceUI();
        }
    } catch (error) {
        console.error(error);
    }
}

function updateAttendanceUI() {
    const clockInBtn = document.getElementById('btn-clock-in');
    const clockOutBtn = document.getElementById('btn-clock-out');
    const totalHoursContainer = document.getElementById('total-hours-container');

    if (!currentAttendance) {
        // Belum clock in
        document.getElementById('today-clock-in').textContent = '-';
        document.getElementById('today-clock-out').textContent = '-';
        totalHoursContainer.style.display = 'none';

        clockInBtn.disabled = false;
        clockInBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        clockOutBtn.disabled = true;
        clockOutBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        // Sudah clock in
        document.getElementById('today-clock-in').textContent = formatTime(currentAttendance.clock_in);

        if (currentAttendance.clock_out) {
            // Sudah clock out
            document.getElementById('today-clock-out').textContent = formatTime(currentAttendance.clock_out);
            document.getElementById('today-total-hours').textContent = `${currentAttendance.total_hours} jam`;
            totalHoursContainer.style.display = 'block';

            clockInBtn.disabled = true;
            clockInBtn.classList.add('opacity-50', 'cursor-not-allowed');
            clockOutBtn.disabled = true;
            clockOutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            // Belum clock out
            document.getElementById('today-clock-out').textContent = '-';
            totalHoursContainer.style.display = 'none';

            clockInBtn.disabled = true;
            clockInBtn.classList.add('opacity-50', 'cursor-not-allowed');
            clockOutBtn.disabled = false;
            clockOutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

async function clockIn() {
    const notes = document.getElementById('notes').value;

    // Get GPS location
    if (!navigator.geolocation) {
        showToast('Browser tidak mendukung GPS', 'error');
        return;
    }

    showToast('Mendapatkan lokasi GPS...', 'info');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            try {
                const response = await fetch('/api/attendances/clock-in', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        employee_id: currentEmployee.id,
                        latitude,
                        longitude,
                        notes
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showToast(result.message, 'success');
                    document.getElementById('notes').value = '';
                    await loadTodayAttendance();
                    await loadAttendanceHistory();
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                showToast('Terjadi kesalahan. Coba lagi.', 'error');
                console.error(error);
            }
        },
        (error) => {
            showToast('Tidak dapat mengakses lokasi GPS. Aktifkan GPS dan izinkan akses lokasi.', 'error');
            console.error(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function clockOut() {
    const notes = document.getElementById('notes').value;

    // Get GPS location
    if (!navigator.geolocation) {
        showToast('Browser tidak mendukung GPS', 'error');
        return;
    }

    showToast('Mendapatkan lokasi GPS...', 'info');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            try {
                const response = await fetch('/api/attendances/clock-out', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        employee_id: currentEmployee.id,
                        latitude,
                        longitude,
                        notes
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showToast(result.message, 'success');
                    document.getElementById('notes').value = '';
                    await loadTodayAttendance();
                    await loadAttendanceHistory();
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                showToast('Terjadi kesalahan. Coba lagi.', 'error');
                console.error(error);
            }
        },
        (error) => {
            showToast('Tidak dapat mengakses lokasi GPS. Aktifkan GPS dan izinkan akses lokasi.', 'error');
            console.error(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ================================================
// ATTENDANCE HISTORY
// ================================================

function getAttendancePeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    let startDate, endDate;

    if (day >= 29) {
        // Periode dari 29 bulan ini s/d 28 bulan depan
        startDate = new Date(year, month, 29);
        endDate = new Date(year, month + 1, 28);
    } else {
        // Periode dari 29 bulan lalu s/d 28 bulan ini
        startDate = new Date(year, month - 1, 29);
        endDate = new Date(year, month, 28);
    }

    return { startDate, endDate };
}

async function loadAttendanceHistory() {
    try {
        const { startDate, endDate } = getAttendancePeriod();
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Update period info
        const periodInfo = `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        document.getElementById('period-info').textContent = periodInfo;

        const response = await fetch(`/api/attendances?employee_id=${currentEmployee.id}&start_date=${startDateStr}&end_date=${endDateStr}`);
        const result = await response.json();

        if (result.success) {
            renderAttendanceHistory(result.data);
        }
    } catch (error) {
        console.error(error);
    }
}

function renderAttendanceHistory(attendances) {
    const container = document.getElementById('attendance-history');

    if (!attendances || attendances.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada riwayat absensi</p>';
        return;
    }

    let html = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">';
    html += '<thead class="bg-gray-50">';
    html += '<tr>';
    html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>';
    html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>';
    html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>';
    html += '<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody class="bg-white divide-y divide-gray-200">';

    attendances.forEach(att => {
        const date = new Date(att.date);
        const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
        const isSunday = date.getDay() === 0;

        const clockIn = formatTime(att.clock_in);
        const clockOut = formatTime(att.clock_out);
        const totalHours = att.total_hours ? `${att.total_hours} jam` : '-';

        html += '<tr class="hover:bg-gray-50">';
        html += `<td class="px-4 py-3 text-sm">`;
        html += `<div class="font-medium text-gray-900">${dateStr}</div>`;
        html += `<div class="text-xs text-gray-500 ${isSunday ? 'text-red-600 font-semibold' : ''}">${dayName}</div>`;
        html += `</td>`;
        html += `<td class="px-4 py-3 text-sm text-gray-900">${clockIn}</td>`;
        html += `<td class="px-4 py-3 text-sm text-gray-900">${clockOut}</td>`;
        html += `<td class="px-4 py-3 text-sm font-medium text-blue-600">${totalHours}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ================================================
// TOAST NOTIFICATION
// ================================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toast-content');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    // Set icon and color
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

    // Auto hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}
