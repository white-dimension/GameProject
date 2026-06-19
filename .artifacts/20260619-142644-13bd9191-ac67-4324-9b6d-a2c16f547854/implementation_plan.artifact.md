# Fix Unresponsive 'Claim All' Button

The goal is to ensure the "Claim All Rewards" button in the task panel is clickable and responsive.

## Problem Analysis
- **Pointer Events**: In `render()`, there's logic that sets `.left-panel-col` to `pointer-events: none` during battle. While there's a reset in the `else` block, it might be failing if the transition state is inconsistent after a reset.
- **Z-Index/Overlay**: The `_modalOverlay` or other UI elements might be capturing clicks if they aren't properly hidden or cleared.
- **Button Scope**: The button is inside `UISystem`, but if the parent container has `pointer-events: none`, it won't receive clicks.

## Proposed Changes

### UI System
#### [UI.js](file:///D:/01_DesignProjects/App_Build/GameProject/Scripts/UI.js)

- **Explicitly restore pointer events**: In the non-battle branch of `render()`, ensure `pointer-events: auto` is explicitly set on the left panel.
- **Expose internal functions**: Ensure `_claimAllTasks` and `_claimReward` are correctly exposed in the return object of `UISystem` so the `onclick` handlers in the HTML strings can find them.
- **Ensure clean modal state**: In `init()`, ensure `_modalOverlay` is explicitly hidden.

```javascript
// In render()
} else {
    var leftCol2 = document.querySelector('.left-panel-col');
    if (leftCol2) { leftCol2.style.pointerEvents = 'auto'; } // Explicitly set to 'auto'
    // ...
}

// In return object at the bottom of UI.js
return {
    // ... existing ...
    _claimAllTasks: _claimAllTasks,
    _claimReward: _claimReward
};
```

## Verification Plan

### Manual Verification
1. **Reset and Start**: Perform a game reset, click "Activate Progenitor".
2. **Task Completion**: Complete some initial tasks (usually automatic for first few steps).
3. **Click Test**: Click the "一键领取全部奖励" button.
4. **Result Check**:
    - Verify that a notification appears ("批量同步完成").
    - Verify that the rewards are added to the BP/Inventory.
    - Verify that the task items become struck through.
