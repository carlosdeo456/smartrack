# SmartTrack Frontend - Quick Component Reference

## UI Component Library

### Import all components
```jsx
import { Button, Card, Badge, Alert, Input, Modal, Spinner, Tabs, Tooltip, Toast } from './components/ui';
```

## Button
```jsx
<Button variant="primary" size="md" onClick={handler}>
  Click me
</Button>
```
**Variants:** primary | secondary | danger | outline | success
**Sizes:** sm | md | lg

## Card
```jsx
<Card header="Title" footer={<Button>Save</Button>} hover>
  Content here
</Card>
```

## Badge
```jsx
<Badge variant="success" size="md">
  In Transit
</Badge>
```
**Variants:** default | primary | success | warning | danger | info

## Alert
```jsx
<Alert type="error" title="Error" onClose={handleClose}>
  Something went wrong
</Alert>
```
**Types:** success | error | warning | info

## Input
```jsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  value={email}
  onChange={handleChange}
  error={errorMsg}
/>
```

## Modal
```jsx
<Modal isOpen={isOpen} onClose={handleClose} title="Confirm">
  <p>Delete this item?</p>
  <Button variant="danger">Delete</Button>
</Modal>
```
**Sizes:** sm | md | lg | xl

## Spinner
```jsx
<Spinner size="lg" color="blue" />
```
**Sizes:** sm | md | lg
**Colors:** blue | white | gray

## Tabs
```jsx
<Tabs
  tabs={[
    { label: 'Tab 1', content: <div>Content 1</div> },
    { label: 'Tab 2', content: <div>Content 2</div> }
  ]}
  onChange={(index) => console.log(index)}
/>
```

## Tooltip
```jsx
<Tooltip text="Help text" position="top">
  <span>Hover me</span>
</Tooltip>
```
**Positions:** top | bottom | left | right

## Toast Notifications
```jsx
import { useNotification } from './components/common';

const { notifications, addNotification, removeNotification } = useNotification();

addNotification('Success!', 'success', 3000);
```
**Types:** success | error | warning | info

## Feature Components

### Import
```jsx
import { Header, Sidebar, MapContainer, DetailsPanel, SensorMonitor, StatusBadge } from './components/features';
```

### Header
```jsx
<Header title="SmartTrack" subtitle="Real-time Tracking" />
```

### Sidebar
```jsx
<Sidebar
  shipments={shipments}
  onSelectShipment={setSelected}
  selectedShipmentId={selected?.id}
/>
```

### MapContainer
```jsx
<MapContainer selectedShipment={shipment} isLoading={false} />
```

### DetailsPanel
```jsx
<DetailsPanel shipment={shipment} />
```

### SensorMonitor
```jsx
<SensorMonitor sensorData={{ temperature: 22, humidity: 65, pressure: 1013 }} />
```

### StatusBadge
```jsx
<StatusBadge status="in_transit" />
```

## Common Components

### Error Boundary
```jsx
import { ErrorBoundary } from './components/common';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Loading Spinner
```jsx
import { LoadingSpinner } from './components/common';

<LoadingSpinner fullPage message="Loading..." />
```

## Utility Functions

### Formatters
```jsx
import { formatDate, formatTime, formatDateTime, formatDistance, formatTemperature } from './utils/formatters';

formatDate(new Date());           // "Jun 4, 2026"
formatTime(new Date());           // "11:30 PM"
formatDateTime(new Date());       // "Jun 4, 2026 11:30 PM"
formatDistance(5000);             // "5.0 km"
formatTemperature(22.5);          // "22.5°C"
```

### Constants
```jsx
import { SHIPMENT_STATUS, STATUS_COLORS, SOCKET_EVENTS } from './utils/constants';

// Usage
if (status === SHIPMENT_STATUS.IN_TRANSIT) {
  // ...
}
```

## Styling

### Tailwind Classes Used
- Colors: bg-blue-600, text-gray-900, border-gray-200
- Spacing: p-4, m-6, gap-3
- Layout: grid, flex, items-center
- Effects: shadow-lg, rounded-lg, transition
- Responsive: md:col-span-3, md:grid-cols-2

### Custom Animations
- slideIn: Toast notifications
- fadeIn: Fade in effects
- spin: Loading spinner
- scale: Hover effects

## Best Practices

1. Always import from component index files:
   ```jsx
   // Good
   import { Button } from './components/ui';
   
   // Avoid
   import Button from './components/ui/Button';
   ```

2. Use PropTypes for validation
3. Wrap apps with ErrorBoundary
4. Use useNotification for user feedback
5. Use StatusBadge for consistent status display
6. Keep components small and focused
7. Reuse UI components over creating new ones

## Development Workflow

1. **Create a new page:**
   ```jsx
   // pages/MyPage.jsx
   import React from 'react';
   import { Header } from '../components/features';
   import { Button, Card } from '../components/ui';
   
   const MyPage = () => (
     <div>
       <Header title="My Page" />
       <Card>
         <Button>Action</Button>
       </Card>
     </div>
   );
   
   export default MyPage;
   ```

2. **Add a feature component:**
   ```jsx
   // components/features/MyComponent.jsx
   import React from 'react';
   import { Card } from '../ui';
   import PropTypes from 'prop-types';
   
   const MyComponent = ({ data }) => (
     <Card header="Title">
       {/* Content */}
     </Card>
   );
   
   MyComponent.propTypes = {
     data: PropTypes.object.isRequired,
   };
   
   export default MyComponent;
   ```

3. **Always export from index:**
   ```jsx
   // components/features/index.js
   export { default as MyComponent } from './MyComponent';
   ```

---

Generated: 2026-06-04
Last Updated: Phase Complete - All UI Components Ready
