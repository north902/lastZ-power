import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    zh: {
        title: '戰力追蹤',
        subtitle: '聯盟數據中心 V2',
        guest_mode: '訪客模式',
        admin_tag: '管理員',
        logout: '登出系統',
        personal_entry: '個人填報',
        all_management: '全盟管理',
        footer_text: '© 2026 戰力追蹤',
        admin_login_gate: '管理員伺服器登入口',
        status_operational: '正常運作',
        loading_system: '正在初始化戰力系統...',
        preparing_env: '正在準備戰鬥環境...',
        back_to_guest: '← 返回訪客輸入模式',
        login_success: '登入成功！',
        register_success: '註冊成功！',
        op_failed: '操作失敗，請稍後再試',
        email_in_use: '此 Email 已被使用',
        invalid_email: 'Email 格式不正確',
        weak_password: '密碼強度不足（至少6個字元）',
        auth_failed: 'Email 或密碼錯誤',
        google_failed: 'Google 登入失敗，請稍後再試',
        system_name: '遊戲戰力追蹤系統',
        login: '登入',
        register: '註冊',
        password_label: '密碼',
        processing: '處理中...',
        or_text: '或',
        google_login: '使用 Google 登入',


        // UserForm
        form_title: '填寫戰力資料',
        form_desc: '請輸入您的最新英雄戰力資訊，讓盟友掌握戰場動態',
        save_success: '✅ 資料已成功儲存！',
        save_failed: '儲存失敗：',
        error_occurred: '發生錯誤：',
        game_id: '遊戲 ID',
        alliance: '所屬聯盟',
        game_id_placeholder: '例如: KingArthas',
        alliance_placeholder: '例如: LastHope',
        team1: '第一隊戰力 (M)',
        team2: '第二隊戰力 (M)',
        team3: '第三隊戰力 (M)',
        save_data: '儲存資料',
        saving: '儲存中...',
        combat_details: '隊伍戰力詳情',
        current_total: '當前統計總戰力',
        data_preview: '資料預覽',
        sync_notice: '資料將同步至聯盟大數據庫',
        last_updated: '上次更新',
        id_required: '遊戲 ID 為必填',
        alliance_required: '聯盟名稱為必填',

        // AdminPanel
        admin_title: '聯盟數據管理中心',
        admin_desc: '監控分析所有成員的戰力分佈與成長紀錄',
        refresh: '重新整理',
        export_csv: '匯出數據庫',
        preparing_export: '準備下載 CSV...',
        stats_overview: '統計資訊',
        display_count: '顯示人數',
        avg_s1: 'S1 平均',
        avg_s2: 'S2 平均',
        avg_s3: 'S3 平均',
        search_placeholder: '快速搜尋 遊戲 ID 或 聯盟...',
        filter_options: '篩選條件',
        member_id: '成員 ID',
        alliance_label: '所屬聯盟',
        s1_power: 'S1 戰力(M)',
        s2_power: 'S2 戰力(M)',
        s3_power: 'S3 戰力(M)',
        total_eval: '總數據評估',
        update_record: '更新紀錄',
        actions: '操作',
        delete_confirm: '⚠️ 確定要刪除 {id} 的資料嗎？此操作不可恢復。',
        delete_success: '刪除成功',
        edit: '編輯',
        edit_record: '編輯成員紀錄',
        update_success: '更新成功',
        cancel: '取消',
        confirm_save: '儲存修改',
        no_data: '目前尚無成員提交數據',
        no_results: '找不到相關成員數據',
        intel_v2: '聯盟智庫 V2.0 穩定版',
        data_count: '資料筆數',
        loading_data: '全力載入大數據中...',

    },
    en: {
        title: 'Combat Tracker',
        subtitle: 'Alliance Intel V2',
        guest_mode: 'Guest Mode',
        admin_tag: 'ADMIN',
        logout: 'Logout',
        personal_entry: 'Entry Form',
        all_management: 'Dashboard',
        footer_text: '© 2026 Combat Tracker',
        admin_login_gate: 'Admin Server Entrance',
        status_operational: 'Operational',
        loading_system: 'Initializing Combat System...',
        preparing_env: 'Preparing Combat Environment...',
        back_to_guest: '← Back to Guest Mode',
        login_success: 'Login successful!',
        register_success: 'Registration successful!',
        op_failed: 'Operation failed, please try again later',
        email_in_use: 'This Email is already in use',
        invalid_email: 'Invalid Email format',
        weak_password: 'Password too weak (at least 6 characters)',
        auth_failed: 'Invalid Email or password',
        google_failed: 'Google login failed, please try again',
        system_name: 'Game Power Tracker',
        login: 'Login',
        register: 'Register',
        password_label: 'Password',
        processing: 'Processing...',
        or_text: 'Or',
        google_login: 'Sign in with Google',


        // UserForm
        form_title: 'Power Data Entry',
        form_desc: 'Enter your latest hero power info to keep allies updated',
        save_success: '✅ Data saved successfully!',
        save_failed: 'Save failed: ',
        error_occurred: 'Error occurred: ',
        game_id: 'Game ID',
        alliance: 'Alliance',
        game_id_placeholder: 'e.g., KingArthas',
        alliance_placeholder: 'e.g., LastHope',
        team1: 'Team 1 Power (M)',
        team2: 'Team 2 Power (M)',
        team3: 'Team 3 Power (M)',
        save_data: 'Save Data',
        saving: 'Saving...',
        combat_details: 'Team Power Details',
        current_total: 'Total Combat Power',
        data_preview: 'Data Preview',
        sync_notice: 'Data will be synced to Alliance database',
        last_updated: 'Last updated',
        id_required: 'Game ID is required',
        alliance_required: 'Alliance name is required',

        // AdminPanel
        admin_title: 'Alliance Intel Center',
        admin_desc: 'Monitor and analyze member power distribution',
        refresh: 'Refresh',
        export_csv: 'Export CSV',
        preparing_export: 'Preparing CSV download...',
        stats_overview: 'Statistics',
        display_count: 'Members',
        avg_s1: 'S1 Avg',
        avg_s2: 'S2 Avg',
        avg_s3: 'S3 Avg',
        search_placeholder: 'Search Game ID or Alliance...',
        filter_options: 'Filters',
        member_id: 'Member ID',
        alliance_label: 'Alliance',
        s1_power: 'S1 Power(M)',
        s2_power: 'S2 Power(M)',
        s3_power: 'S3 Power(M)',
        total_eval: 'Total Eval',
        update_record: 'Update Record',
        actions: 'Action',
        delete_confirm: '⚠️ Are you sure you want to delete {id}? This cannot be undone.',
        delete_success: 'Deleted successfully',
        edit: 'Edit',
        edit_record: 'Edit Member Record',
        update_success: 'Update successful',
        cancel: 'Cancel',
        confirm_save: 'Save Changes',
        no_data: 'No data submitted yet',
        no_results: 'No matching records found',
        intel_v2: 'Alliance Intel V2.0 Stable',
        data_count: 'Total Records',
        loading_data: 'Loading Big Data...',

    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(localStorage.getItem('preferred_lang') || 'zh');

    const t = (key) => {
        return translations[lang][key] || key;
    };

    const toggleLang = () => {
        const newLang = lang === 'zh' ? 'en' : 'zh';
        setLang(newLang);
        localStorage.setItem('preferred_lang', newLang);
    };

    return (
        <LanguageContext.Provider value={{ lang, t, toggleLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
