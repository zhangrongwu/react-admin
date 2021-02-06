import React, {useState, useEffect, useRef} from 'react';
import {Collapse} from 'antd';
import {DesktopOutlined} from '@ant-design/icons';
import config from 'src/commons/config-hoc';
import Pane from '../pane';
import Layout from './layout';
import Font from './font';
import Position from './position';
import Background from './background';
import Border from './border';
import StyleEditor from './style-editor';
import StyleNavigator from './style-navigator';
import {v4 as uuid} from 'uuid';
import {useHeight} from 'ra-lib';
import './style.less';

const {Panel} = Collapse;

export default config({
    connect: state => {
        return {
            selectedNode: state.dragPage.selectedNode,
        };
    },
})(function ComponentStyle(props) {
    let {
        selectedNode = {},
        action: {dragPage: dragPageAction},
    } = props;

    // 有 null 的情况
    if (!selectedNode) selectedNode = {};

    const {
        __config = {},
        componentName,
        props: componentProps = {},
    } = selectedNode;
    const {
        componentDisplayName,
    } = __config;

    const {
        style = {},
    } = componentProps;

    let currentName = componentDisplayName || componentName;
    if (typeof currentName === 'function') currentName = currentName({node: selectedNode});

    const [styleEditorVisible, setStyleEditorVisible] = useState(false);
    const [, setRender] = useState('');
    const boxRef = useRef(null);
    const [height] = useHeight(boxRef);

    function handleChange(values, replace) {
        if (!selectedNode?.componentName) return;

        if (!selectedNode?.props) selectedNode.props = {};

        if (!selectedNode.props.style) selectedNode.props.style = {};

        const style = selectedNode.props.style;

        if (replace) {
            // 直接替换，一般来自源码编辑器
            selectedNode.props.style = values;
            // 触发当前组件重新渲染 让编辑器拿到最新的style
            setRender(uuid());
        } else {
            // 合并
            selectedNode.props.style = {
                ...style,
                ...values,
            };
        }

        // 设置 key 每次保证渲染，都重新创建节点，否则属性无法被清空，样式为空，或者不合法，将不能覆盖已有样式
        // prefStyle: {backgroundColor: 'red'} nextStyle: {backgroundColor: 'red111'}, 样式依旧为红色
        selectedNode.props.key = uuid();

        console.log('selectedNode style', JSON.stringify(selectedNode.props.style, null, 4));

        dragPageAction.render();
    }

    useEffect(() => {
        dragPageAction.setRightSideWidth(styleEditorVisible ? 440 : 385);
    }, [styleEditorVisible]);

    const options = [
        {key: 'layout', title: '布局', icon: <DesktopOutlined/>, Component: Layout},
        {key: 'font', title: '文字', icon: <DesktopOutlined/>, Component: Font},
        {key: 'position', title: '定位', icon: <DesktopOutlined/>, Component: Position},
        {key: 'background', title: '背景', icon: <DesktopOutlined/>, Component: Background},
        {key: 'border', title: '边框', icon: <DesktopOutlined/>, Component: Border},
    ];
    return (
        <Pane
            fitHeight
            header={(
                <div styleName="header">
                    <div>当前选中: {currentName}</div>
                    <DesktopOutlined
                        styleName="tool"
                        onClick={() => setStyleEditorVisible(!styleEditorVisible)}
                    />
                </div>
            )}
        >
            <StyleEditor
                value={style}
                onChange={values => handleChange(values, true)}
                visible={styleEditorVisible}
                onCancel={() => setStyleEditorVisible(false)}
            />
            <div styleName="root">
                <StyleNavigator containerRef={boxRef} dataSource={options}/>
                <div ref={boxRef} styleName="collapseBox" style={{height}}>
                    <Collapse
                        style={{border: 'none'}}
                        defaultActiveKey={options.map(item => item.key)}
                    >
                        {options.map(item => {
                            const {key, title, Component} = item;
                            return (
                                <Panel key={key} header={<div id={`style-${key}`}>{title}</div>}>
                                    <Component value={style} onChange={handleChange}/>
                                </Panel>
                            );
                        })}
                    </Collapse>
                    <div style={{height: height - 220}}/>
                </div>
            </div>
        </Pane>
    );
});
