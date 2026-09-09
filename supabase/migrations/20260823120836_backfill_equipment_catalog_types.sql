update public.wpi_equipment_catalog
set equipment_type = case equipment_name
  when '卧式离心泵' then '单级卧式离心泵'
  when '潜水排污泵' then '潜水式排污泵'
  when '电动蝶阀' then '电动法兰蝶阀'
  when '闸阀' then '手动法兰闸阀'
  when '电磁流量计' then '管道式电磁流量计'
  when '低压配电柜' then '低压成套开关设备'
  when '变频控制柜' then '变频调速控制柜'
  when '投加加药装置' then 'PAC 自动加药装置'
  when '机械格栅机' then '回转式机械格栅'
  when '鼓风机' then '工艺鼓风机'
  else equipment_type
end,
updated_at = now()
where coalesce(trim(equipment_type), '') = ''
  and equipment_name in (
    '卧式离心泵',
    '潜水排污泵',
    '电动蝶阀',
    '闸阀',
    '电磁流量计',
    '低压配电柜',
    '变频控制柜',
    '投加加药装置',
    '机械格栅机',
    '鼓风机'
  );
